import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "rsc", "Invalid environment");

//@ts-ignore
import ReactServer from "react-server-dom-webpack/server.edge";
import { memoize } from "@hiogawa/utils";
import type { BundlerConfig, ImportManifestEntry } from "../types";
import type { PageContext } from "vike/types";

async function importServerAction(id: string): Promise<Function> {
  const [file, name] = id.split("#") as [string, string];
  const mod: any = await importServerReference(file);
  return mod[name];
}

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

declare global {
  var __VITE_ASSETS_MANIFEST_RSC__: {
    [pageId: string]: { importPage: () => Promise<PageContext["Page"]> };
  };
}

function importPageById(
  pageId: string,
  //TODO: remove this argument and inject page paths in dev transform
  // needed for out-of-context server-actions to work
  pageContext?: PageContext
): Promise<PageContext["Page"]> {
  if (import.meta.env.DEV) {
    return import(
      //TODO: Fix this hack 💀
      // We need to import the Page here in the rsc environment(this file)
      /* @vite-ignore */
      pageContext!.configEntries.Page[0].configDefinedByFile!
    ).then((m) => m.default || m.Page);
  } else {
    const assetsManifest = __VITE_ASSETS_MANIFEST_RSC__;
    return assetsManifest[pageId].importPage();
  }
}

export async function renderPageRsc(
  pageContext: PageContext
): Promise<ReadableStream<Uint8Array<ArrayBufferLike>>> {
  console.log("[Renderer] Rendering page to RSC stream");
  //TODO: remove pageContext argument
  const Page = await importPageById(pageContext.pageId!, pageContext);
  const bundlerConfig = createBundlerConfig();
  const rscPayloadStream = ReactServer.renderToReadableStream(
    // TODO: add form when initial request is POST
    { root: <Page /> },
    bundlerConfig
  );

  return rscPayloadStream;
}

export async function handleServerAction({
  actionId,
  pageId,
  body,
}: {
  actionId: string;
  pageId: string;
  body: string | FormData;
}): Promise<ReadableStream<Uint8Array>> {
  console.log("[Server] Handling server action:", actionId);

  //TODO: make this work in dev
  const Page = await importPageById(pageId);
  const args = await ReactServer.decodeReply(body);
  const action = await importServerAction(actionId);
  const returnValue = await action.apply(null, args);

  const bundlerConfig = createBundlerConfig();
  return ReactServer.renderToReadableStream(
    { returnValue, root: <Page /> },
    bundlerConfig
  );
}
