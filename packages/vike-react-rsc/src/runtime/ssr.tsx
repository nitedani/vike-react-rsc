import envName from "virtual:environment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "ssr", "Invalid environment");

import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { renderToStream } from "react-streaming/server.web";
import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { PageContextProvider } from "../hooks/pageContext/pageContext-client";
import runtimeRsc from "virtual:runtime/server";
import type { Head } from "../types/Config";
import { isReactElement } from "../utils/isReactElement";
//@ts-ignore
import { renderToStaticMarkup } from "react-dom/server.edge";
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
  const [rscStreamForHtml, rscStreamForClientScript] = rscPayloadStream!.tee();

  const payload =
    (await createFromReadableStream<React.ReactNode>(
      rscStreamForHtml
    )) as RscPayload;

  const htmlStream = await renderToStream(
    <PageContextProvider pageContext={pageContext}>
      {payload.root}
    </PageContextProvider>,
    {
      userAgent: pageContext.headers?.["user-agent"],
      streamOptions: {
        formState: payload.formState,
      },
    }
  );

  const canClose = htmlStream.doNotClose();
  //@ts-ignore
  rscStreamForClientScript.pipeThrough(new TextDecoderStream()).pipeTo(
    new WritableStream({
      write(rscChunk) {
        htmlStream.injectToStream(
          `<script>self.__rsc_web_stream_push(${JSON.stringify(
            rscChunk
          )})</script>`
        );
      },
      close() {
        htmlStream.injectToStream(
          `<script>self.__rsc_web_stream_close()</script>`
        );
        canClose();
      },
    })
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
        <div id="root">${htmlStream}</div>
      </body>
    </html>`;

  return {
    documentHtml,
    pageContext: { enableEagerStreaming: true },
  };
};

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
