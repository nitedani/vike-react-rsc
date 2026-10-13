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
import type { PagePayload } from "../types";

// The CSS and JS of the client components a page's HTML renders, for the head
const clientDeps = new AsyncLocalStorage<ClientDeps>();
type ClientDeps = { css: Set<string>; js: Set<string> };
setOnClientReference(({ deps }) => {
  for (const href of deps.css) clientDeps.getStore()?.css.add(href);
  for (const href of deps.js) clientDeps.getStore()?.js.add(href);
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
  }
  // Once the shell has rendered, React has loaded every client component in it
  const clientLinks = renderClientLinks(deps);

  return {
    documentHtml: escapeInject`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    ${renderHead(pageContext)}
    ${clientLinks}
  </head>
  <body>
    <div id="root">${html}</div>
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

function renderHead(pageContext: PageContextServer) {
  const tags = (pageContext.config.Head ?? []).map((Head) =>
    renderToStaticMarkup(
      <PageContextProvider pageContext={pageContext}>{typeof Head === "function" ? <Head /> : Head}</PageContextProvider>
    )
  );
  return dangerouslySkipEscape(tags.join(""));
}

function renderClientLinks({ css, js }: ClientDeps) {
  const cssLinks = [...css].map((href) =>
    // In dev, the shape of Vike's own CSS links, so Vike's dev cleanup removes them once Vite has injected the CSS
    import.meta.env.DEV ? (
      <link key={href} rel="stylesheet" type="text/css" href={`${href}?direct`} />
    ) : (
      <link key={href} rel="stylesheet" href={href} />
    )
  );
  // React drops plugin-rsc's own preloads for a client component whose module loads during the decode, before the render
  const jsLinks = [...js].map((href) => <link key={href} rel="modulepreload" href={href} crossOrigin="" />);
  return dangerouslySkipEscape(renderToStaticMarkup([...cssLinks, ...jsLinks]));
}
