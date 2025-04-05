import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "rsc", "Invalid environment");

//@ts-ignore
import ReactServer from "react-server-dom-webpack/server.edge";
import { memoize } from "@hiogawa/utils";
import type { BundlerConfig, ImportManifestEntry } from "../types";
import type { PageContext } from "vike/types";
import { getPageElementRsc } from "../integration/getPageElement/getPageElement-server";
import { providePageContext } from "../hooks/pageContext/pageContext-server";

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

export async function renderPageRsc(
  pageContext: PageContext
): Promise<ReadableStream<Uint8Array<ArrayBufferLike>>> {
  console.log("[Renderer] Rendering page to RSC stream");
  const bundlerConfig = createBundlerConfig();
  const root = await getPageElementRsc(pageContext);
  return providePageContext(pageContext, () =>
    ReactServer.renderToReadableStream(
      // TODO: add form when initial request is POST
      {
        root,
      },
      bundlerConfig
    )
  );
}

export async function handleServerAction({
  actionId,
  pageContext,
  body,
}: {
  actionId: string;
  pageContext: PageContext;
  body: string | FormData;
}): Promise<ReadableStream<Uint8Array>> {
  console.log("[Server] Handling server action:", actionId);
  const [args, action, root] = await Promise.all([
    ReactServer.decodeReply(body),
    importServerAction(actionId),
    getPageElementRsc(pageContext),
  ]);
  const returnValue = await providePageContext(pageContext, () =>
    action.apply(null, args)
  );
  const bundlerConfig = createBundlerConfig();
  return providePageContext(pageContext, () =>
    ReactServer.renderToReadableStream(
      {
        returnValue,
        root,
      },
      bundlerConfig
    )
  );
}
