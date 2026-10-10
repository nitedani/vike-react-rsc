import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static.edge";
import { renderToStream } from "react-streaming/server.web";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { PageContextProvider } from "../hooks/pageContext/pageContext-client";
import { FLIGHT_CONTENT_TYPE } from "../protocol";
import type { ErrorReason, RscPayload } from "../types";
import type { Head } from "../types/Config";
import { isReactElement } from "../utils/isReactElement";
import { getRsc } from "./bridge";

// https://vike.dev/onRenderHtml
export const onRenderHtml: OnRenderHtmlAsync = async (pageContext) => {
  // The action's answer (ssr/action.ts): its Flight, or the error that replaced the page
  if (pageContext.rscAction) {
    const errorReason = getErrorReason(pageContext);
    pageContext.content = errorReason ? getRsc(pageContext).runtime.renderError(errorReason) : pageContext.rscPayload;
    pageContext.headersResponse.set("content-type", FLIGHT_CONTENT_TYPE);
    return;
  }

  if (!pageContext.rscPayload) throw new Error("[vike-react-rsc] pageContext.rscPayload is missing");
  // One Flight render: the HTML reads one branch, Vike streams the other to the browser
  const [htmlBranch, browserBranch] = pageContext.rscPayload.tee();
  pageContext.rscPayload = browserBranch;
  // tee() stops the Flight render only when both branches are cancelled
  const htmlBranchEnd = new AbortController();
  const payload = await createFromReadableStream<RscPayload>(
    htmlBranch.pipeThrough(new TransformStream(), { signal: htmlBranchEnd.signal })
  );
  const page = <PageContextProvider pageContext={pageContext}>{payload.root}</PageContextProvider>;
  const pageHtml = pageContext.isPrerendering
    ? await prerenderPage(page)
    : await renderStreamedPage(page, payload, pageContext, htmlBranchEnd);

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        ${getHeadHtml(pageContext)}
      </head>
      <body>
        <div id="root">${pageHtml}</div>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: { enableEagerStreaming: true },
  };
};

function getErrorReason(pageContext: PageContextServer): ErrorReason | undefined {
  if (pageContext.is404) return "not-found";
  if (pageContext.abortStatusCode || pageContext.errorWhileRendering) return "error";
}

async function renderStreamedPage(
  page: ReactNode,
  payload: RscPayload,
  pageContext: PageContextServer,
  htmlBranchEnd: AbortController
) {
  const stream = await renderToStream(page, {
    userAgent: pageContext.headers?.["user-agent"],
    streamOptions: {
      formState: payload.formState,
      nonce: pageContext.cspNonce ?? undefined,
    },
  });
  // Also ends when the client leaves the HTML response mid-stream
  void stream.streamEnd.then(() => htmlBranchEnd.abort());
  return stream;
}

async function prerenderPage(page: ReactNode) {
  // A static document cannot resume streamed Suspense fallbacks after deployment
  const { prelude } = await prerender(page);
  return dangerouslySkipEscape(await new Response(prelude).text());
}

function getHeadHtml(pageContext: PageContextServer) {
  return dangerouslySkipEscape(
    (pageContext.config.Head ?? [])
      .filter((Head) => Head !== null && Head !== undefined)
      .map((Head) => getHeadElementHtml(Head, pageContext))
      .join("\n")
  );
}

function getHeadElementHtml(Head: NonNullable<Head>, pageContext: PageContextServer): string {
  const headElement = isReactElement(Head) ? (
    Head
  ) : (
    <PageContextProvider pageContext={pageContext}>
      <Head />
    </PageContextProvider>
  );
  return renderToStaticMarkup(headElement);
}
