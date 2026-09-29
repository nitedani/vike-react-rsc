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
import type { EncodedRscChunk, RscPayload } from "../types";

const INIT_SCRIPT = `
self.__raw_import = (id) => import(id);
self.__rsc_payload_stream = new ReadableStream({
	start(controller) {
		const encoder = new TextEncoder();
		self.__rsc_web_stream_push = (chunk) => {
			controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : Uint8Array.from(atob(chunk.base64), (c) => c.charCodeAt(0)));
		};
		self.__rsc_web_stream_close = () => { controller.close(); };
	}
});
`;

const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

// Flight writes typed arrays as raw bytes, which need not be valid UTF-8: a
// chunk that isn't travels as base64, since decoding it to text would be lossy.
function encodeRscChunk(chunk: Uint8Array): EncodedRscChunk {
  try {
    return utf8.decode(chunk);
  } catch {
    let binary = "";
    for (const byte of chunk) binary += String.fromCharCode(byte);
    return { base64: btoa(binary) };
  }
}

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

  rscStream
    .pipeTo(
      new WritableStream<Uint8Array>({
        write(rscChunk) {
          htmlStream.injectToStream(
            `<script>self.__rsc_web_stream_push(${JSON.stringify(
              encodeRscChunk(rscChunk)
            )})</script>`
          );
        },
        // Only reached when the payload streamed to completion. A truncated
        // payload must not get the close marker: the client would treat it as
        // a whole one and hydrate against a partial tree.
        close() {
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
  const rscPayloadBytesPromise = new Response(rscStream).arrayBuffer();
  // A static document cannot resume streamed Suspense fallbacks after deployment.
  const { prelude } = await prerender(page);
  const [pageHtml, rscPayloadBytes] = await Promise.all([
    new Response(prelude).text(),
    rscPayloadBytesPromise,
  ]);
  // For client-side navigation on a static host. Text only: binary Flight data
  // doesn't survive it.
  pageContext.rscPayloadString = new TextDecoder().decode(rscPayloadBytes);

  return {
    pageHtml: dangerouslySkipEscape(pageHtml),
    rscPayloadHtml: dangerouslySkipEscape(
      `<script>self.__rsc_web_stream_push(${JSON.stringify(
        encodeRscChunk(new Uint8Array(rscPayloadBytes))
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
