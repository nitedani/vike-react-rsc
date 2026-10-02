import { environmentName } from "vike/runtime";
import { tinyassert } from "@hiogawa/utils";
tinyassert(environmentName === "server", "Invalid environment");

import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { renderToStream } from "react-streaming/server.web";
import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { PageContextProvider } from "../hooks/pageContext/pageContext-client";
import type { Head } from "../types/Config";
import { isReactElement } from "../utils/isReactElement";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static.edge";
import React from "react";
import type { RscPayload } from "../types";

export const onRenderHtmlSsr: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  tinyassert(pageContext.rscPayload);
  // One Flight render: SSR reads one branch, Vike streams the other to the browser.
  const [rscStreamForHtml, rscStreamForBrowser] = pageContext.rscPayload.tee();
  pageContext.rscPayload = rscStreamForBrowser;

  const payload =
    (await createFromReadableStream<React.ReactNode>(
      rscStreamForHtml
    )) as RscPayload;
  const page = (
    <PageContextProvider pageContext={pageContext}>
      {payload.root}
    </PageContextProvider>
  );
  const pageHtml = pageContext.isPrerendering
    ? await prerenderPage(page)
    : await renderStreamedPage(page, payload, pageContext);

  const headHtml = getHeadHtml(pageContext);

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        ${headHtml}
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

async function renderStreamedPage(
  page: React.ReactNode,
  payload: RscPayload,
  pageContext: PageContextServer
) {
  return renderToStream(page, {
    userAgent: pageContext.headers?.["user-agent"],
    streamOptions: {
      formState: payload.formState,
      nonce: pageContext.cspNonce ?? undefined,
    },
  });
}

async function prerenderPage(page: React.ReactNode) {
  // A static document cannot resume streamed Suspense fallbacks after deployment.
  const { prelude } = await prerender(page);
  return dangerouslySkipEscape(await new Response(prelude).text());
}

function getHeadHtml(pageContext: PageContextServer) {
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
    ${headElementsHtml}
  `;
  return headHtml;
}

function getHeadElementHtml(
  Head: NonNullable<Head>,
  pageContext: PageContextServer
): string {
  let headElement: React.ReactNode;
  if (isReactElement(Head)) {
    headElement = Head;
  } else {
    headElement = (
      <PageContextProvider pageContext={pageContext}>
        <Head />
      </PageContextProvider>
    );
  }

  return renderToStaticMarkup(headElement);
}
