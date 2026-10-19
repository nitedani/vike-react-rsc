import { createFromReadableStream, setOnClientReference } from "@vitejs/plugin-rsc/ssr";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToReadableStream } from "react-dom/server.edge";
import { renderToStream } from "react-streaming/server.web";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { PageContextProvider } from "../pageContext";
import { FLIGHT_CONTENT_TYPE } from "../protocol";
import { getHeadSetting } from "../integration/getHeadSetting";
import type { HeadValue, PagePayload } from "../types";
import { isCallable } from "../utils/isCallable";
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
  // The page renders to Flight once: one copy becomes the HTML, Vike inlines the other for hydration
  const [forHtml, forBrowser] = pageContext.rscPayload.tee();
  pageContext.rscPayload = forBrowser;
  // tee() keeps the render going while either copy is read, so the HTML's copy stops once the HTML is sent, or the
  // client left. The decoder holds its stream's lock, hence a pipe that can be cut.
  const htmlSent = new AbortController();
  const { root, formState } = await createFromReadableStream<PagePayload>(
    forHtml.pipeThrough(new TransformStream(), { signal: htmlSent.signal })
  );
  const page = <PageContextProvider pageContext={pageContext}>{root}</PageContextProvider>;
  const nonce = pageContext.cspNonce ?? undefined;
  let html;
  if (pageContext.isPrerendering) {
    html = await renderWhole(page, nonce);
  } else {
    html = await renderToStream(page, { userAgent: pageContext.headers?.["user-agent"], streamOptions: { nonce, formState } });
    void html.streamEnd.then(() => htmlSent.abort());
    deps.injectToStream = html.injectToStream;
  }
  // Once the shell has rendered, React has loaded every client component in it
  const clientLinks = dangerouslySkipEscape(renderClientLinks(deps));

  const headHtml = getHeadHtml(pageContext);

  const { headHtmlBegin, headHtmlEnd, bodyHtmlBegin, bodyHtmlEnd } = getHtmlInjections(pageContext);

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

// A pre-rendered page has to be complete, so it waits for every Suspense boundary. React's prerender() would, but takes
// no CSP nonce. react-streaming would, but Vike's pre-rendering loads its own copy, which takes over ours.
async function renderWhole(page: ReactNode, nonce: string | undefined) {
  const stream = await renderToReadableStream(page, { nonce });
  await stream.allReady;
  return dangerouslySkipEscape(await new Response(stream).text());
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
  // vike-react-rsc's PageContextProvider, which the RSC build shares between environments
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

function getHtmlInjections(pageContext: PageContextServer) {
  const { config } = pageContext;
  const renderHooks = (hooks: HtmlInjection[] | undefined) => {
    const values = (hooks ?? []).map((hook) => (isCallable(hook) ? hook(pageContext) : hook));
    return dangerouslySkipEscape(values.join(""));
  };
  return {
    headHtmlBegin: renderHooks(config.headHtmlBegin),
    headHtmlEnd: renderHooks(config.headHtmlEnd),
    bodyHtmlBegin: renderHooks(config.bodyHtmlBegin),
    bodyHtmlEnd: renderHooks(config.bodyHtmlEnd),
  };
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
