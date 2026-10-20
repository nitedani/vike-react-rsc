import { createFromReadableStream, setOnClientReference } from "@vitejs/plugin-rsc/ssr";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToReadableStream } from "react-dom/server.edge";
import { renderToStream } from "react-streaming/server.web";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { getAbort, toVikeAbort, type Abort } from "../abort";
import { getHeadSetting } from "../integration/getHeadSetting";
import { getPageElement } from "../integration/getPageElement";
import { PageContextProvider } from "../pageContext";
import { FLIGHT_CONTENT_TYPE } from "../protocol";
import { getRedirectUrl } from "../redirect";
import type { HeadValue, PagePayload } from "../types";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { getTagAttributesString, type TagAttributes } from "../utils/getTagAttributesString";

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
  const htmlSent = new AbortController();
  // https://github.com/vikejs/vike-react/issues/87#issuecomment-2488742744
  // Before the Flight's first read, which starts its render, so server components see what the hooks set too
  await callCumulativeHooks(pageContext.config.onBeforeRenderHtml, pageContext);
  // Under ssr: false the HTML has no page: the browser renders it, from the Flight if it has one
  const ssr = pageContext.config.ssr !== false;
  const flight = ssr && pageContext.rscPayload ? await decodeFlight(pageContext, htmlSent.signal) : undefined;
  const formState = flight?.formState;
  const root = ssr ? (flight?.root ?? (pageContext.config.Page ? getPageElement(pageContext) : null)) : null;
  const page = <PageContextProvider pageContext={pageContext}>{root}</PageContextProvider>;
  const nonce = pageContext.cspNonce ?? undefined;
  // A `throw redirect()` or `throw render()` in a server component: Vike answers it until this hook returns, then the
  // HTML has started and only the stream can tell the browser
  let boundaryAbort: unknown;
  const onAbort = (error: unknown, abort: Abort) => {
    if (deps.injectToStream) deps.injectToStream(renderAbortMeta(abort));
    else boundaryAbort ??= error;
  };
  try {
    if (root === null) {
      // Under ssr: false, neither is set
    } else if (pageContext.isPrerendering) {
      pageContext.pageHtmlString = await renderWhole(page, nonce, onAbort);
    } else {
      const stream = await renderToStream(page, {
        userAgent: pageContext.headers?.["user-agent"],
        // Else react-streaming streams, except to bots
        disable: isStreamDisabled(pageContext) || undefined,
        streamOptions: { nonce, formState },
        onBoundaryError: (error) => {
          const abort = getAbort(error);
          if (abort) onAbort(error, abort);
        },
      });
      // A crawler gets the page whole, so Vike can still answer a boundary's abort, which react-streaming reports late
      if (stream.disabled) await stream.streamEnd;
      void stream.streamEnd.then(() => htmlSent.abort());
      deps.injectToStream = stream.injectToStream;
      pageContext.pageHtmlStream = stream;
    }
    // Inside a Suspense boundary, but reported before this hook returns, e.g. a crawler's
    if (boundaryAbort) throw boundaryAbort;
  } catch (error) {
    const abort = getAbort(error);
    if (!abort) throw error;
    htmlSent.abort();
    void pageContext.rscPayload?.cancel();
    throw toVikeAbort(abort);
  }
  // https://github.com/vikejs/vike/discussions/1804#discussioncomment-10394481
  await callCumulativeHooks(pageContext.config.onAfterRenderHtml, pageContext);
  // As onAfterRenderHtml() left them
  if (pageContext.pageHtmlString !== undefined && pageContext.pageHtmlStream !== undefined) {
    throw new Error(
      "[vike-react-rsc] +onAfterRenderHtml left both pageContext.pageHtmlString and pageContext.pageHtmlStream set: set only one of them, and the other to undefined"
    );
  }
  const html = pageContext.pageHtmlString ? dangerouslySkipEscape(pageContext.pageHtmlString) : (pageContext.pageHtmlStream ?? "");
  // Once the shell has rendered, React has loaded every client component in it
  const clientLinks = dangerouslySkipEscape(renderClientLinks(deps));

  const headHtml = getHeadHtml(pageContext);

  const { headHtmlBegin, headHtmlEnd, bodyHtmlBegin, bodyHtmlEnd } = await getHtmlInjections(pageContext);

  const { htmlAttributesString, bodyAttributesString, rootAttributesString } = getTagAttributes(pageContext);

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

// vike-react's resolveStreamSetting(), with +stream.require always true: server components render only to a stream
function isStreamDisabled(pageContext: PageContextServer): boolean {
  let enable = true;
  pageContext.config.stream
    ?.slice()
    .reverse()
    .forEach((setting) => {
      if (typeof setting === "boolean") enable = setting;
      else if (typeof setting === "string") enable = true;
      else if (setting && setting.enable !== null) enable = setting.enable ?? true;
    });
  return !enable;
}

function decodeFlight(pageContext: PageContextServer, signal: AbortSignal): Promise<PagePayload> {
  // The page renders to Flight once: one copy becomes the HTML, Vike inlines the other for hydration
  const [forHtml, forBrowser] = pageContext.rscPayload!.tee();
  pageContext.rscPayload = forBrowser;
  // tee() keeps the render going while either copy is read, so the HTML's copy stops once the HTML is sent, or the
  // client left. The decoder holds its stream's lock, hence a pipe that can be cut.
  return createFromReadableStream<PagePayload>(forHtml.pipeThrough(new TransformStream(), { signal }));
}

// A pre-rendered page has to be complete, so it waits for every Suspense boundary. React's prerender() would, but takes
// no CSP nonce. react-streaming would, but Vike's pre-rendering loads its own copy, which takes over ours.
async function renderWhole(page: ReactNode, nonce: string | undefined, onAbort: (error: unknown, abort: Abort) => void) {
  const onError = (error: unknown) => {
    const abort = getAbort(error);
    if (abort) onAbort(error, abort);
    else console.error(error);
  };
  const stream = await renderToReadableStream(page, { nonce, onError });
  await stream.allReady;
  return new Response(stream).text();
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

function getHeadHtml(pageContext: PageContextServer) {
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
