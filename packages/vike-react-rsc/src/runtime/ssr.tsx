import envName from "virtual:enviroment-name";
import { assert } from "../utils/assert";
import { memoize, tinyassert } from "@hiogawa/utils";
assert(envName === "ssr", "Invalid environment");

import { dangerouslySkipEscape, escapeInject } from "vike/server";
import { renderToStream } from "react-streaming/server.web";
//@ts-ignore
import ReactServerDOMClient from "react-server-dom-webpack/client.edge";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { Shell } from "../integration/shell";

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

function createModuleMap() {
  return new Proxy(
    {},
    {
      get(_target, id, _receiver) {
        return new Proxy(
          {},
          {
            get(_target, name, _receiver) {
              return {
                id,
                name,
                chunks: [],
              };
            },
          }
        );
      },
    }
  );
}

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

Object.assign(globalThis, {
  __webpack_require__: memoize(importClientReference),
  __webpack_chunk_load__: async () => {},
});

export const onRenderHtmlSsr: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  const { rscPayloadStream } = pageContext;
  const [rscStreamForHtml, rscStreamForClientScript] = rscPayloadStream!.tee();

  const rootNode =
    await ReactServerDOMClient.createFromReadableStream<React.ReactNode>(
      rscStreamForHtml,
      {
        serverConsumerManifest: {
          moduleMap: createModuleMap(),
          moduleLoading: { prefix: "" },
        },
      }
    );

  const htmlStream = await renderToStream(<Shell>{rootNode}</Shell>, {
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

  return {
    documentHtml,
    pageContext: { enableEagerStreaming: true },
  };
};
