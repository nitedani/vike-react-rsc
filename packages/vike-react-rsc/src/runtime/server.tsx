import envName from "virtual:enviroment-name";
import { assert } from "../utils/assert";
assert(envName === "rsc", "Invalid environment");

//@ts-ignore
import ReactServer from "react-server-dom-webpack/server.edge";
import type { BundlerConfig, ImportManifestEntry } from "../types";
import { tinyassert, memoize } from "@hiogawa/utils";
import type { PageContext } from "vike/types";

async function importServerReference(id: string): Promise<unknown> {
  if (import.meta.env.DEV) {
    return import(/* @vite-ignore */ id);
  } else {
    //TODO: add "use server"
    // const references = await import("virtual:server-references" as string);
    // const dynImport = references.default[id];
    // tinyassert(dynImport, `server reference not found '${id}'`);
    // return dynImport();
  }
}
Object.assign(globalThis, {
  __vite_react_server_webpack_require__: memoize(importServerReference),
  __vite_react_server_webpack_chunk_load__: () => {
    throw new Error("__webpack_chunk_load__");
  },
});

function createBundlerConfig(): BundlerConfig {
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

export async function renderPageRsc(
  pageContext: PageContext
): Promise<ReadableStream<Uint8Array<ArrayBufferLike>>> {
  console.log("[Renderer] Rendering page to RSC stream");
  let Page = pageContext.Page;

  if (import.meta.env.DEV) {
    Page = await import(
      //TODO: Fix this hack 💀
      // We need to import the Page here in the rsc environment(this file)
      /* @vite-ignore */
      pageContext.configEntries.Page[0].configDefinedByFile!
    ).then((m) => m.default || m.Page);
  } else {
    Page = await import(
      //TODO: Fix this hack 💀
      // We need to import the Page here in the rsc environment(this file)
      /* @vite-ignore */
      `../entries/${pageContext.pageId?.substring(1)?.replaceAll("/", "_")}.mjs`
    ).then(
      (m) => m.configValuesSerialized.Page.valueSerialized.exportValues.Page
    );
  }

  // Get the page shell with the Page component
  const bundlerConfig = createBundlerConfig();
  const rscPayloadStream = ReactServer.renderToReadableStream(
    <Page />,
    bundlerConfig
  );

  return rscPayloadStream;
}
