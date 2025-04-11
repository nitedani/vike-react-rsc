import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "ssr", "Invalid environment");

//@ts-ignore
import ReactServer from "react-server-dom-webpack/server.edge";
import { memoize } from "@hiogawa/utils";
import type { BundlerConfig, ImportManifestEntry } from "../types";
import type { PageContext } from "vike/types";
import { getPageElementRsc } from "../integration/getPageElement/getPageElement-server";
import { providePageContext } from "../hooks/pageContext/pageContext-server";
import { provideServerActionContext } from "./serverActionContext";

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
  // Check if this is a server component call
  const isServerComponentCall = pageContext.headers?.['x-rsc-component-call'] === 'true';

  console.log("[Server] Handling server action:", actionId, isServerComponentCall ? "(from server component)" : "");

  // Create context for this server action execution
  const context = { shouldRerender: false };

  // Decode arguments and get the action function
  const [args, action] = await Promise.all([
    ReactServer.decodeReply(body),
    importServerAction(actionId),
  ]);

  // Execute the action within the server action context
  const returnValue = await provideServerActionContext(context, () =>
    providePageContext(pageContext, () => action.apply(null, args))
  );

  const bundlerConfig = createBundlerConfig();

  // Only include the root component if rerender was called
  if (context.shouldRerender) {
    console.log("[Server] Re-rendering page after server action");
    const root = await getPageElementRsc(pageContext);
    return providePageContext(pageContext, () =>
      ReactServer.renderToReadableStream(
        {
          returnValue,
          root,
        },
        bundlerConfig
      )
    );
  } else {
    console.log("[Server] Returning server action result without re-rendering");
    return providePageContext(pageContext, () =>
      ReactServer.renderToReadableStream(
        {
          returnValue,
        },
        bundlerConfig
      )
    );
  }
}
