import { environmentName } from "vike/runtime";
import { tinyassert } from "@hiogawa/utils";
tinyassert(environmentName === "ssr", "Invalid environment");

import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { renderToStream } from "react-streaming/server.web";
import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { PageContextProvider } from "../hooks/pageContext/pageContext-client";
import runtimeRsc from "virtual:runtime/server";
import type { Head } from "../types/Config";
import { isReactElement } from "../utils/isReactElement";
import { renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static.edge";
import React from "react";
import type { RscPayload } from "../types";

const INIT_SCRIPT = `
self.__raw_import = (id) => import(id);
self.__rsc_web_stream = new ReadableStream({
	start(controller) {
		self.__rsc_web_stream_push = (chunk) => { controller.enqueue(chunk); };
		self.__rsc_web_stream_close = () => { controller.close(); };
	}
});
if (!self.TextEncoderStream) {
  self.TextEncoderStream = class { _controller; encoder = new TextEncoder(); readable = new ReadableStream({ start: c => this._controller = c }); writable = new WritableStream({ write: chunk => this._controller.enqueue(this.encoder.encode(chunk)), close: () => this._controller.close() }); };
}
self.__rsc_payload_stream = self.__rsc_web_stream.pipeThrough(new TextEncoderStream());
`;

export const onRenderHtmlSsr: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  const rscPayloadStream = await runtimeRsc.renderPageRsc(pageContext);
  const [rscStreamForHtml, rscStreamForBrowser] = rscPayloadStream!.tee();

  const payload =
    (await createFromReadableStream<React.ReactNode>(
      rscStreamForHtml
    )) as RscPayload;
  const page = (
    <PageContextProvider pageContext={pageContext}>
      {payload.root}
    </PageContextProvider>
  );
  const { pageHtml, rscPayloadHtml } = pageContext.isPrerendering
    ? await prerenderPage(page, rscStreamForBrowser, pageContext)
    : await renderStreamedPage(
        page,
        rscStreamForBrowser,
        payload,
        pageContext
      );

  const headHtml = getHeadHtml(pageContext);

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <script>${dangerouslySkipEscape(INIT_SCRIPT)}</script>
        ${headHtml}
      </head>
      <body>
        <div id="root">${pageHtml}</div>
        ${rscPayloadHtml}
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: { enableEagerStreaming: true },
  };
};

async function renderStreamedPage(
  page: React.ReactNode,
  rscStream: ReadableStream<Uint8Array>,
  payload: RscPayload,
  pageContext: PageContextServer
) {
  const htmlStream = await renderToStream(page, {
    userAgent: pageContext.headers?.["user-agent"],
    streamOptions: {
      formState: payload.formState,
    },
  });

  // doNotClose() holds the HTML response open until the RSC payload finishes piping in.
  const canClose = htmlStream.doNotClose();
  const decoder = new TextDecoder();

  const injectRscChunk = (rscChunk: string) => {
    if (!rscChunk) return;
    htmlStream.injectToStream(
      `<script>self.__rsc_web_stream_push(${JSON.stringify(
        rscChunk
      )})</script>`
    );
  };

  rscStream
    .pipeTo(
      new WritableStream<Uint8Array>({
        write(rscChunk) {
          injectRscChunk(decoder.decode(rscChunk, { stream: true }));
        },
        // Only reached when the payload streamed to completion. A truncated
        // payload must not get the close marker: the client would treat it as
        // a whole one and hydrate against a partial tree.
        close() {
          injectRscChunk(decoder.decode());
          htmlStream.injectToStream(
            `<script>self.__rsc_web_stream_close()</script>`
          );
        },
      })
    )
    .catch((err) => {
      // The payload is truncated either way, but a failure here is a server fault and
      // must not be mistaken for the client having gone away.
      console.error(
        "[vike-react-rsc] Failed piping the RSC payload into the HTML stream:",
        err
      );
    })
    // Runs once, on both paths: the response must never be left held open.
    .finally(canClose);

  return {
    pageHtml: htmlStream,
    rscPayloadHtml: "",
  };
}

async function prerenderPage(
  page: React.ReactNode,
  rscStream: ReadableStream<Uint8Array>,
  pageContext: PageContextServer
) {
  const rscPayloadStringPromise = new Response(rscStream).text();
  // A static document cannot resume streamed Suspense fallbacks after deployment.
  const { prelude } = await prerender(page);
  const [pageHtml, rscPayloadString] = await Promise.all([
    new Response(prelude).text(),
    rscPayloadStringPromise,
  ]);
  pageContext.rscPayloadString = rscPayloadString;

  return {
    pageHtml: dangerouslySkipEscape(pageHtml),
    rscPayloadHtml: dangerouslySkipEscape(
      `<script>self.__rsc_web_stream_push(${JSON.stringify(
        rscPayloadString
      )});self.__rsc_web_stream_close()</script>`
    ),
  };
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
