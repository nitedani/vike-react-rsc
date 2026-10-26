import { createFromReadableStream, setOnClientReference } from "@vitejs/plugin-rsc/ssr";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import { renderToStaticMarkup, type RenderToReadableStreamOptions } from "react-dom/server";
import { renderToReadableStream } from "react-dom/server.edge";
import { renderToStream, type RenderToStreamOptions } from "react-streaming/server.web";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { getAbort, toVikeAbort, type Abort } from "../abort";
import { forkPageContext } from "../forkPageContext";
import { configsClientSide } from "../hooks/useConfig/configsClientSide";
import { getHeadSetting } from "../integration/getHeadSetting";
import { getPageElement } from "../integration/getPageElement";
import { resolveReactOptions } from "../integration/resolveReactOptions";
import { PageContextProvider } from "../pageContext";
import { FLIGHT_CONTENT_TYPE } from "../protocol";
import { getRedirectUrl } from "../redirect";
import type { HeadValue, PageContextInternal, PagePayload } from "../types";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { getTagAttributesString, type TagAttributes } from "../utils/getTagAttributesString";
import { includes } from "../utils/includes";
import { objectKeys } from "../utils/objectKeys";

addEcosystemStamp();

// The CSS and JS of the client components a page's HTML renders, for their links
const clientDeps = new AsyncLocalStorage<ClientDeps>();
type ClientDeps = { css: Set<string>; js: Set<string>; injectToStream?: (html: string) => void };
setOnClientReference(({ deps }) => {
  const store = clientDeps.getStore();
  if (!store) return;
  const css = deps.css.filter((href) => !store.css.has(href));
  const js = deps.js.filter((href) => !store.js.has(href));
  for (const href of css) store.css.add(href);
  for (const href of js) store.js.add(href);
  // Once the shell has rendered, the links go in the stream, before the Suspense boundary that renders the component
  if (store.injectToStream && (css.length || js.length)) store.injectToStream(renderClientLinks({ css, js }));
});

export const onRenderHtml: OnRenderHtmlAsync = async (pageContext) => {
  // A server action: the answer is Flight, and the middleware (ssr/action.ts) sends it
  const call = pageContext.rscAction;
  if (call && !call.isForm) {
    pageContext.content = call.renderAnswer(pageContext);
    pageContext.headersResponse.set("content-type", FLIGHT_CONTENT_TYPE);
    return;
  }
  const deps: ClientDeps = { css: new Set(), js: new Set() };
  return clientDeps.run(deps, () => renderDocument(pageContext, deps));
};

async function renderDocument(pageContext: PageContextServer, deps: ClientDeps) {
  // Aborted once the HTML has rendered, or once nobody will read it. Aborting stops React's HTML render and the copy of
  // the Flight that the HTML reads.
  const htmlRender = new AbortController();
  // Vike cancels the HTML once the client leaves, which stops the Flight too, but only after onRenderHtml() has returned
  // the HTML. Until then, we listen to the request's abort signal ourselves.
  const left = pageContext.rscRequestSignal;
  const onLeave = () => cancelRender(pageContext, htmlRender);
  left?.addEventListener("abort", onLeave);
  try {
    left?.throwIfAborted();
    await renderPageToHtml(pageContext, deps, htmlRender);
    return await buildDocument(pageContext, deps);
  } catch (error) {
    // Vike gets no HTML, so nothing will read the Flight, nor any HTML stream the hooks left: stop both renders
    cancelRender(pageContext, htmlRender);
    if (!left?.aborted) throw error;
    // The client left, so nobody gets the HTML, nor the error that cancelling it caused. Vike sends this instead of a
    // document.
    pageContext.content = "";
  } finally {
    left?.removeEventListener("abort", onLeave);
  }
}

// The document around the page's HTML, from the HTML injections, the head settings and the tag attributes
async function buildDocument(pageContext: PageContextServer & PageContextInternal, deps: ClientDeps) {
  // +onAfterRenderHtml may replace pageHtmlString or pageHtmlStream, but it must leave only one of them set
  if (pageContext.pageHtmlString !== undefined && pageContext.pageHtmlStream !== undefined) {
    throw new Error(
      "[vike-react-rsc] +onAfterRenderHtml left both pageContext.pageHtmlString and pageContext.pageHtmlStream set: set only one of them, and the other to undefined"
    );
  }
  // A string goes to Vike as a stream. Vike would hold an HTML string until the Flight has ended, and it sends a stream
  // at once.
  const html = pageContext.pageHtmlStream ?? new Response(pageContext.pageHtmlString ?? "").body!;
  // The client components React has loaded so far: every one outside <Suspense>. One inside a <Suspense> that is still
  // pending gets its links in the stream, from setOnClientReference() above.
  const clientLinks = dangerouslySkipEscape(renderClientLinks(deps));

  const headHtml = getHeadHtml(pageContext);

  const { headHtmlBegin, headHtmlEnd, bodyHtmlBegin, bodyHtmlEnd } = await getHtmlInjections(pageContext);

  const { htmlAttributesString, bodyAttributesString, rootAttributesString } = getTagAttributes(pageContext);

  // Keep only what the client-side applies upon navigation, and remove the rest (HTML-only and/or
  // non-serializable values such as <Head> components). https://github.com/vikejs/vike-vue/issues/233
  removeServerOnlyConfigViaHook(pageContext);

  return {
    documentHtml: escapeInject`<!DOCTYPE html>
<html${dangerouslySkipEscape(htmlAttributesString)}>
  <head>
    <meta charset="UTF-8" />
    ${headHtmlBegin}
    ${headHtml}
    ${clientLinks}
    ${headHtmlEnd}
  </head>
  <body${dangerouslySkipEscape(bodyAttributesString)}>
    ${bodyHtmlBegin}
    <div${dangerouslySkipEscape(rootAttributesString)}>${html}</div>
    ${bodyHtmlEnd}
  </body>
</html>`,
    pageContext: { enableEagerStreaming: true },
  };
}

// As in vike-react: runs +onBeforeRenderHtml, renders the page to pageContext.pageHtmlString or pageHtmlStream, then
// runs +onAfterRenderHtml
async function renderPageToHtml(pageContext: PageContextServer, deps: ClientDeps, htmlRender: AbortController): Promise<void> {
  // Before any HTML hook runs, so that server components see pageContext's keys as on a client navigation, where no HTML
  // hook runs
  // TODO: remove once server components get their own pageContext: https://github.com/nitedani/vike-react-rsc/issues/30
  forkPageContext(pageContext);
  // Under ssr: false the HTML has no page: the browser renders it, from the Flight if it has one
  const ssr = pageContext.config.ssr !== false;
  const flight = ssr && pageContext.rscPayload ? await decodeFlight(pageContext, htmlRender.signal) : undefined;
  // The root from the Flight, else the element of the client Page, else none
  const root = ssr ? (flight?.root ?? (pageContext.config.Page ? getPageElement(pageContext) : null)) : null;
  if (root !== null) pageContext.page = <PageContextProvider pageContext={pageContext}>{root}</PageContextProvider>;
  // https://github.com/vikejs/vike-react/issues/87#issuecomment-2488742744
  await callCumulativeHooks(pageContext.config.onBeforeRenderHtml, pageContext);
  // Stop if the client left while +onBeforeRenderHtml ran
  htmlRender.signal.throwIfAborted();
  await renderRootToHtml(pageContext, deps, htmlRender, flight?.formState);
  // https://github.com/vikejs/vike/discussions/1804#discussioncomment-10394481
  await callCumulativeHooks(pageContext.config.onAfterRenderHtml, pageContext);
}

// Renders pageContext.page, which +onBeforeRenderHtml may have replaced, to pageContext.pageHtmlString or pageHtmlStream
async function renderRootToHtml(pageContext: PageContextServer, deps: ClientDeps, htmlRender: AbortController, formState: ReactFormState | undefined) {
  const { renderToStringOptions, renderToStreamOptions } = resolveReactOptions(pageContext);
  const streamSetting = resolveStreamSetting(pageContext);
  // On a page that vike-react renders with renderToString(), only renderToStringOptions apply. We pass them to React's
  // stream render, because server components can't render to a string.
  const rendersToString = !streamSetting.enable && !streamSetting.require;
  const options: RenderToStreamOptions | undefined = rendersToString ? { streamOptions: renderToStringOptions } : renderToStreamOptions;
  const streamOptions = {
    ...options?.streamOptions,
    nonce: pageContext.cspNonce ?? options?.streamOptions?.nonce,
    formState: formState ?? options?.streamOptions?.formState,
  };
  // A server component may `throw redirect()` or `throw render()`. Until this function returns, Vike can still answer
  // it. After that, the HTML has started, so only tags we inject into the stream can tell the browser.
  let boundaryAbort: unknown;
  const onAbort = (error: unknown, abort: Abort) => {
    if (deps.injectToStream) deps.injectToStream(renderAbortMeta(abort));
    else boundaryAbort ??= error;
  };
  try {
    const { page } = pageContext;
    if (page) {
      if (rendersToString && pageContext.isPrerendering) {
        pageContext.pageHtmlString = await renderWhole(page, streamOptions, onAbort);
      } else if (rendersToString) {
        // Rendered whole, as vike-react's renderToString() renders it, for a crawler too. As on a page that streams, the
        // render stops once the client leaves, or after react-streaming's default timeout.
        const render = getRenderSignal(htmlRender.signal);
        pageContext.pageHtmlString = await renderWhole(page, { ...streamOptions, signal: render.signal }, onAbort).finally(render.clear);
        htmlRender.abort();
      } else {
        const stream = await renderToStream(page, {
          userAgent: pageContext.headers?.["user-agent"],
          // Without `disable`, react-streaming streams, except to bots, which get the page whole
          disable: streamSetting.enable === false || undefined,
          ...options,
          // Always a Web stream: the react-streaming entry imported above renders no Node stream. Vike accepts either
          // kind of stream, so a +react that asks for a Node stream gets the same page.
          webStream: true,
          streamOptions,
          signal: options?.signal ? AbortSignal.any([htmlRender.signal, options.signal]) : htmlRender.signal,
          onBoundaryError: (error) => {
            const abort = getAbort(error);
            if (abort) onAbort(error, abort);
            else options?.onBoundaryError?.(error);
          },
        });
        // react-streaming renders the page whole for a crawler, when pre-rendering, and with
        // { require: true, enable: false }. We wait for its end: react-streaming reports a Suspense boundary's abort
        // late, and Vike can answer it only until this function returns.
        if (stream.disabled) await stream.streamEnd;
        void stream.streamEnd.then(() => htmlRender.abort());
        deps.injectToStream = stream.injectToStream;
        // That stream has ended, so injecting into it would throw. +onAfterRenderHtml gets a new stream with the same
        // HTML, which it can still inject into.
        pageContext.pageHtmlStream = stream.disabled ? toDisabledStream(await new Response(stream.readable).text()) : stream;
      }
    }
    // An abort thrown inside a Suspense boundary and reported before this function returns, e.g. on a page rendered
    // whole: Vike answers it
    if (boundaryAbort) throw boundaryAbort;
  } catch (error) {
    const abort = getAbort(error);
    if (!abort) throw error;
    throw toVikeAbort(abort);
  }
}

// A signal that aborts once `signal` does, or after react-streaming's default timeout. Call clear() once the render has
// ended, to stop the timer.
function getRenderSignal(signal: AbortSignal): { signal: AbortSignal; clear: () => void } {
  const timedOut = new AbortController();
  const timer = setTimeout(() => timedOut.abort(), 20 * 1000);
  return { signal: AbortSignal.any([signal, timedOut.signal]), clear: () => clearTimeout(timer) };
}

// Stops React's HTML render, and the Flight's render. The Flight stops only once both its copies are cancelled: the
// HTML's copy, which htmlRender's signal cuts, and the browser's copy, which Vike reads only after onRenderHtml()
// returns.
function cancelRender(pageContext: PageContextServer, htmlRender: AbortController) {
  htmlRender.abort();
  void pageContext.rscPayload?.cancel();
}

// As vike-react's resolveStreamSetting()
function resolveStreamSetting(pageContext: PageContextServer): { enable: boolean | null; require: boolean } {
  const streamSetting = { enable: null as boolean | null, require: false };
  pageContext.config.stream
    ?.slice()
    .reverse()
    .forEach((setting) => {
      if (typeof setting === "boolean") streamSetting.enable = setting;
      else if (setting) {
        if (setting.enable !== null) streamSetting.enable = setting.enable ?? true;
        if (setting.require !== undefined) streamSetting.require = setting.require;
      }
    });
  return streamSetting;
}

function decodeFlight(pageContext: PageContextServer, signal: AbortSignal): Promise<PagePayload> {
  // The page renders to Flight once: one copy becomes the HTML, Vike inlines the other for hydration
  const [forHtml, forBrowser] = pageContext.rscPayload!.tee();
  pageContext.rscPayload = forBrowser;
  // tee() keeps the render going while either copy is read, so the HTML's copy stops once the HTML is sent, or the
  // client left. The decoder holds its stream's lock, hence a pipe that can be cut.
  return createFromReadableStream<PagePayload>(forHtml.pipeThrough(new TransformStream(), { signal }));
}

// A page without +stream, pre-rendered too, waits for every Suspense boundary. React's prerender() would too, but takes
// no CSP nonce. react-streaming would too, but useStream() and useAsync() would then work, while vike-react's
// renderToString() makes them throw an error that says to set stream: true.
async function renderWhole(page: ReactNode, options: RenderToReadableStreamOptions, onAbort: (error: unknown, abort: Abort) => void) {
  const onError: RenderToReadableStreamOptions["onError"] = (error, errorInfo) => {
    const abort = getAbort(error);
    if (abort) onAbort(error, abort);
    // Once the render is aborted, other errors are the abort's consequences: don't log them
    else if (options.signal?.aborted) return;
    // A server component's error comes through the Flight with a digest, and the rsc env has already logged it
    else if (typeof error === "object" && error !== null && "digest" in error) return;
    else if (options.onError) options.onError(error, errorInfo);
    else console.error(error);
  };
  // As react-streaming does when it doesn't stream: React puts every Suspense boundary's content in place, however
  // large, rather than in a hidden part of the HTML that a script moves into place
  const stream = await renderToReadableStream(page, { ...options, progressiveChunkSize: Number.MAX_SAFE_INTEGER, onError });
  await stream.allReady;
  return new Response(stream).text();
}

// A stream like react-streaming's when it doesn't stream, as vike-react's +onAfterRenderHtml gets it. What a hook
// injects goes after the page's HTML, in order, until the stream has been read to its end.
function toDisabledStream(html: string): Awaited<ReturnType<typeof renderToStream>> {
  const chunks: (string | Promise<string>)[] = [html];
  let ended = false;
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        const chunk = chunks.shift();
        if (chunk === undefined) {
          ended = true;
          controller.close();
        } else controller.enqueue(encoder.encode(await chunk));
      },
    },
    // Pulled only when read, so the hooks can inject first
    { highWaterMark: 0 },
  );
  return {
    readable,
    pipe: null,
    disabled: true,
    streamEnd: Promise.resolve(true),
    hasStreamEnded: () => ended,
    doNotClose: () => () => {},
    abort: () => {},
    injectToStream: (chunk) => {
      if (ended) throw new Error("[vike-react-rsc] pageContext.pageHtmlStream.injectToStream() was called after the stream ended");
      chunks.push(chunk);
    },
  };
}

// Once the HTML has started: search engines skip the page, and a redirect works without JavaScript
function renderAbortMeta(abort: Abort) {
  return renderToStaticMarkup(
    <>
      <meta name="robots" content="noindex" />
      {/* A path keeps the page's own scheme, so any http(s) base tells the same */}
      {"redirect" in abort && getRedirectUrl(abort.redirect.url, "http://localhost") && (
        <meta httpEquiv="refresh" content={`0;url=${abort.redirect.url}`} data-vike-react-rsc-redirect="" />
      )}
    </>
  );
}

function removeServerOnlyConfigViaHook(pageContext: PageContextInternal) {
  const configViaHook = pageContext._configViaHook;
  if (!configViaHook) return;
  objectKeys(configViaHook).forEach((configName) => {
    if (!includes(configsClientSide, configName)) delete configViaHook[configName];
  });
  // Remove it altogether if there isn't anything left, saving KBs sent to the client
  if (objectKeys(configViaHook).length === 0) delete pageContext._configViaHook;
}

function getHeadHtml(pageContext: PageContextServer & PageContextInternal) {
  pageContext._headAlreadySet = true;

  const favicon = getHeadSetting<string | null>("favicon", pageContext);
  const title = getHeadSetting<string | null>("title", pageContext);
  const description = getHeadSetting<string | null>("description", pageContext);
  const image = getHeadSetting<string | null>("image", pageContext);

  const faviconTag = !favicon ? "" : escapeInject`<link rel="icon" href="${favicon}" />`;
  const titleTags = !title ? "" : escapeInject`<title>${title}</title><meta property="og:title" content="${title}" />`;
  const descriptionTags = !description
    ? ""
    : escapeInject`<meta name="description" content="${description}" /><meta property="og:description" content="${description}" />`;
  const imageTags = !image
    ? ""
    : escapeInject`<meta property="og:image" content="${image}"><meta name="twitter:card" content="summary_large_image">`;
  const viewportTag = dangerouslySkipEscape(getViewportTag(getHeadSetting<Viewport>("viewport", pageContext)));

  const headElementsHtml = dangerouslySkipEscape(
    [
      // Added by +Head
      ...(pageContext.config.Head ?? []),
      // Added by useConfig()
      ...(pageContext._configViaHook?.Head ?? []),
    ]
      .filter((Head) => Head !== null && Head !== undefined)
      .map((Head) => getHeadElementHtml(Head, pageContext))
      .join("\n")
  );

  const headHtml = escapeInject`
    ${titleTags}
    ${viewportTag}
    ${headElementsHtml}
    ${faviconTag}
    ${descriptionTags}
    ${imageTags}
  `;
  return headHtml;
}
function getHeadElementHtml(Head: NonNullable<HeadValue>, pageContext: PageContextServer): string {
  return renderToStaticMarkup(
    <PageContextProvider pageContext={pageContext}>{typeof Head === "function" ? <Head /> : Head}</PageContextProvider>
  );
}

function getTagAttributes(pageContext: PageContextServer) {
  let lang = getHeadSetting<string | null>("lang", pageContext);
  // Don't set `lang` to its default value if it's `null` (so that users can set it to `null` in order to remove the default value)
  if (lang === undefined) lang = "en";

  const bodyAttributes = mergeTagAttributesList(getHeadSetting<TagAttributes[]>("bodyAttributes", pageContext));
  const htmlAttributes = mergeTagAttributesList(getHeadSetting<TagAttributes[]>("htmlAttributes", pageContext));
  const rootAttributes = mergeTagAttributesList(getHeadSetting<TagAttributes[]>("rootAttributes", pageContext));

  const bodyAttributesString = getTagAttributesString(bodyAttributes);
  const htmlAttributesString = getTagAttributesString({ ...htmlAttributes, lang: lang ?? htmlAttributes.lang });
  // The root element's `id` is used by onRenderClient(): it's the user's responsibility not to override it.
  const rootAttributesString = getTagAttributesString({ id: "root", ...rootAttributes });

  return { htmlAttributesString, bodyAttributesString, rootAttributesString };
}
function mergeTagAttributesList(tagAttributesList: TagAttributes[] = []) {
  const tagAttributes: TagAttributes = {};
  tagAttributesList.forEach((tagAttrs) => Object.assign(tagAttributes, tagAttrs));
  return tagAttributes;
}

export type Viewport = "responsive" | number | null;
function getViewportTag(viewport: Viewport | undefined): string {
  if (viewport === "responsive" || viewport === undefined) {
    // `user-scalable=no` isn't recommended anymore:
    //   - https://stackoverflow.com/questions/22354435/to-user-scalable-no-or-not-to-user-scalable-no/22544312#comment120949420_22544312
    return '<meta name="viewport" content="width=device-width,initial-scale=1">';
  }
  if (typeof viewport === "number") {
    return `<meta name="viewport" content="width=${viewport}">`;
  }
  return "";
}

// As in vike-react. With this flag, react-streaming's and Vike's errors tell the user to set +stream, e.g. for
// useAsync() on a page that doesn't stream, rather than to install react-streaming.
function addEcosystemStamp() {
  const g = globalThis as Record<string, unknown>;
  g._isVikeReactApp = {};
}

export type HtmlInjection = string | ((pageContext: PageContextServer) => string);

async function getHtmlInjections(pageContext: PageContextServer) {
  const { config } = pageContext;
  const renderHooks = async (hooks: HtmlInjection[] | undefined) => {
    const values = await callCumulativeHooks(hooks, pageContext);
    return dangerouslySkipEscape(values.join(""));
  };
  const [headHtmlBegin, headHtmlEnd, bodyHtmlBegin, bodyHtmlEnd] = await Promise.all([
    renderHooks(config.headHtmlBegin),
    renderHooks(config.headHtmlEnd),
    renderHooks(config.bodyHtmlBegin),
    renderHooks(config.bodyHtmlEnd),
  ]);
  return { bodyHtmlBegin, bodyHtmlEnd, headHtmlBegin, headHtmlEnd };
}

function renderClientLinks({ css, js }: { css: Iterable<string>; js: Iterable<string> }) {
  const cssLinks = [...css].map((href) =>
    // In dev, the shape of Vike's own CSS links, so Vike's dev cleanup removes them once Vite has injected the CSS
    import.meta.env.DEV ? (
      <link key={href} rel="stylesheet" type="text/css" href={`${href}?direct`} />
    ) : (
      // The crossOrigin of React's preload for the same file, so the browser uses that preload
      <link key={href} rel="stylesheet" href={href} crossOrigin="" />
    )
  );
  // React drops plugin-rsc's own preloads for a client component whose module loads during the decode, before the render
  const jsLinks = [...js].map((href) => <link key={href} rel="modulepreload" href={href} crossOrigin="" />);
  return renderToStaticMarkup([...cssLinks, ...jsLinks]);
}
