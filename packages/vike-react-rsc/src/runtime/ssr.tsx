import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "ssr", "Invalid environment");

import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { renderToStream } from "react-streaming/server.web";

import * as ReactServerDOMClient from "@hiogawa/vite-rsc/react/ssr";

import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { PageContextProvider } from "../hooks/pageContext/pageContext-client";
import runtimeRsc from "virtual:runtime/server";
import type { Head } from "../types/Config";
import { isReactElement } from "../utils/isReactElement";
//@ts-ignore
import { renderToStaticMarkup } from "react-dom/server.edge";
import React from "react";

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
console.log('[RSC Init Script] Payload stream setup on window.__rsc_payload_stream');
`;

async function importClientReference(id: string) {
  if (import.meta.env.DEV) {
    return import(/* @vite-ignore */ id);
  } else {
    const clientReferences = await import(
      "virtual:client-references" as string
    );
    const dynImport = clientReferences.default[id];
    console.log("[RSC] Importing client reference", id);

    tinyassert(dynImport, `client reference not found '${id}'`);
    return dynImport();
  }
}

ReactServerDOMClient.setRequireModule({
  load: importClientReference,
})

export const onRenderHtmlSsr: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  const rscPayloadStream = await runtimeRsc.renderPageRsc(pageContext);
  const [rscStreamForHtml, rscStreamForClientScript] = rscPayloadStream!.tee();

  const payload =
    await ReactServerDOMClient.createFromReadableStream<React.ReactNode>(
      rscStreamForHtml,
    );

  const htmlStream = await renderToStream(
    <PageContextProvider pageContext={pageContext}>
      {payload.root}
    </PageContextProvider>,
    {
      userAgent: pageContext.headers?.["user-agent"],
      streamOptions: {
        //@ts-expect-error
        formState: payload.formState,
      },
    }
  );

  const canClose = htmlStream.doNotClose();
  rscStreamForClientScript.pipeThrough(new TextDecoderStream()).pipeTo(
    new WritableStream({
      write(rscChunk) {
        // console.log("Injecting RSC chunk...");
        htmlStream.injectToStream(
          `<script>self.__rsc_web_stream_push(${JSON.stringify(
            rscChunk
          )})</script>`
        );
      },
      async close() {
        console.log("RSC stream closed, injecting close script.");
        htmlStream.injectToStream(
          `<script>self.__rsc_web_stream_close()</script>`
        );

        // without wait, the following is not injected and the response is closed:
        // <script id="vike_pageContext" type="application/json">
        //     {
        //         "_urlRewrite": null,
        //         "pageId": "/src/pages/index",
        //         "routeParams": {
        //         }
        //     }</script>
        // <script type="module" async>
        //     import RefreshRuntime from "/@react-refresh"
        //     RefreshRuntime.injectIntoGlobalHook(window)
        //     window.$RefreshReg$ = () => {}
        //     window.$RefreshSig$ = () => (type) => type
        //     window.__vite_plugin_react_preamble_installed__ = true
        //     import "/@vite/client";
        //     import "/@fs/home/nitedani/projects/vike-react-rsc/examples/full/src/+client.ts";
        //     import "/@fs/home/nitedani/projects/vike-react-rsc/node_modules/vike/dist/esm/client/client-routing-runtime/entry.js";
        // </script>
        // TODO: why is this needed?
        await new Promise((resolve) => setTimeout(resolve, 200));
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
