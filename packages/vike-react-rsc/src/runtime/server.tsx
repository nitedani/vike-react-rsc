//@ts-ignore
import ReactServer from "react-server-dom-webpack/server.edge";
import type { BundlerConfig, ImportManifestEntry } from "../types";
import { tinyassert, memoize } from "@hiogawa/utils";
import { Suspense, type ReactElement } from "react";
import type { PageContext } from "vike/types";

async function importServerReference(id: string): Promise<unknown> {
  if (import.meta.env.DEV) {
    return import(/* @vite-ignore */ id);
  } else {
    const references = await import("virtual:server-references" as string);
    const dynImport = references.default[id];
    tinyassert(dynImport, `server reference not found '${id}'`);
    return dynImport();
  }
}
Object.assign(globalThis, {
  __vite_react_server_webpack_require__: memoize(importServerReference),
  __vite_react_server_webpack_chunk_load__: () => {
    throw new Error("__webpack_chunk_load__");
  },
});

export function createBundlerConfig(): BundlerConfig {
  return new Proxy(
    {},
    {
      get(_target, $$id, _receiver) {
        tinyassert(typeof $$id === "string");
        let [id, name] = $$id.split("#");
        tinyassert(id);
        tinyassert(name);
        return {
          id,
          name,
          // TODO: preinit not working?
          // `ReactDOMSharedInternals.d.X` seems no-op due to null request context?
          chunks: [id, id],
          async: true,
        } satisfies ImportManifestEntry;
      },
    }
  );
}

export default async function renderPageRsc(
  pageContext: PageContext
): Promise<ReadableStream<Uint8Array<ArrayBufferLike>>> {
  console.log("[Renderer] Rendering page to RSC stream");
  const Page = await import(
    //TODO: Fix this hack
    /* @vite-ignore */
    pageContext.configEntries.Page[0].configDefinedByFile!
  ).then((m) => m.default || m.Page);

  // Get the page shell with the Page component
  const element = getPageElement(Page);
  const bundlerConfig = createBundlerConfig();
  const rscPayloadStream = ReactServer.renderToReadableStream(
    element,
    bundlerConfig
  );

  return rscPayloadStream;
}

function getPageElement(Page: React.ComponentType): ReactElement {
  return (
    <div>
      <Suspense fallback={<div>Loading page...</div>}>
        <Page />
      </Suspense>
    </div>
  );
}
