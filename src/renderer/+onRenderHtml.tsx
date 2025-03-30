import React from "react";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { PageContextServer } from "vike/types";
import { renderToStream } from "react-streaming/server.web";
//@ts-ignore
import ReactServerDOMClient from "react-server-dom-webpack/client.edge";

const INIT_SCRIPT = `
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

const fakeRscClientManifest = { moduleMap: {}, moduleLoading: { prefix: "" } };

// --- Webpack global shims ---
if (typeof (globalThis as any).__webpack_require__ === "undefined") {
  (globalThis as any).__webpack_require__ = (id: string) => {
    console.error("SSR Shim __webpack_require__:", id);
    return {};
  };
}
if (typeof (globalThis as any).__webpack_chunk_load__ === "undefined") {
  (globalThis as any).__webpack_chunk_load__ = (id: string) => {
    console.log("SSR Shim __webpack_chunk_load__:", id);
    return Promise.resolve();
  };
}

export async function onRenderHtml(pageContext: PageContextServer) {
  console.log("[Vike Hook] +onRenderHtml started...");
  const { rscPayloadStream } = pageContext;
  const [rscStreamForHtml, rscStreamForClientScript] = rscPayloadStream!.tee();

  const rootNode =
    await ReactServerDOMClient.createFromReadableStream<React.ReactNode>(
      rscStreamForHtml,
      { serverConsumerManifest: fakeRscClientManifest }
    );

  const htmlStream = await renderToStream(rootNode, {
    userAgent: (pageContext.headersOriginal as any).get("user-agent"),
  });

  const canClose = htmlStream.doNotClose();
  rscStreamForClientScript.pipeThrough(new TextDecoderStream()).pipeTo(
    new WritableStream({
      write(rscChunk) {
        console.log("Injecting RSC chunk...");
        htmlStream.injectToStream(
          `<script>self.__rsc_web_stream_push(${JSON.stringify(
            rscChunk
          )})</script>`
        );
      },
      close() {
        console.log("RSC stream closed, injecting close script.");
        htmlStream.injectToStream(
          `<script>self.__rsc_web_stream_close()</script>`
        );
        canClose();
      },
    })
  );

  const documentHtml = escapeInject`<html><head><title>Vike + RSC (Plugin + Runner)</title><script>${dangerouslySkipEscape(
    INIT_SCRIPT
  )}</script></head><body><div id="root">${htmlStream}</div></body></html>`;

  console.log("[Vike Hook] +onRenderHtml finished.");
  return {
    documentHtml,
    pageContext: { enableEagerStreaming: true },
  };
}
