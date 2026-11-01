import { getPluginApi, type RscPluginManager } from "@vitejs/plugin-rsc";
import type { Connect, DevEnvironment, Plugin, ResolvedConfig } from "vite";

const FIRST_RENDER = "virtual:vike-react-rsc/first-render";

/** In dev, Vite pre-bundles in its first batch what the browser imports through the page's client references. Vike's client entries,
 * which Vite scans, don't import them, so Vite would find them only once the browser does, pre-bundle them late and reload the page,
 * with "Invalid hook call" until then. So the client env loads each client reference plugin-rsc creates as the browser will, and the
 * first batch waits until the first page's response ends */
export function clientReferenceDeps(): Plugin {
  // One per server, by the config its envs share: on a restart, Vite creates the new server before it closes the old one
  const servers = new WeakMap<ResolvedConfig, { client: DevEnvironment; manager: RscPluginManager; firstRender: Promise<void>; warmed: Set<string> }>();
  return {
    name: "vike-react-rsc:client-reference-deps",
    apply: "serve",
    configureServer(server) {
      const client = server.environments.client!;
      let resolveFirstRender!: () => void;
      const firstRender = new Promise<void>((resolve) => (resolveFirstRender = resolve));
      servers.set(server.config, { client, manager: getPluginApi(server.config)!.manager, firstRender, warmed: new Set() });
      // At the front: a middleware added before it, e.g. @hono/vite-dev-server's, may answer the page without calling next()
      server.middlewares.stack.unshift({
        route: "",
        handle: ((req, res, next) => {
          if (req.headers.accept?.includes("text/html")) res.once("close", resolveFirstRender);
          next();
        }) satisfies Connect.NextHandleFunction,
      });
      // Vite's close() waits for the client env's pending requests, which wait for the first batch, and cancels that batch
      const close = server.close;
      server.close = async () => {
        resolveFirstRender();
        await client.waitForRequestsIdle();
        return close();
      };
    },
    // On a cold cache, Vite's first batch waits until the client env has no pending request, so this one holds it
    buildStart() {
      if (this.environment.name === "client") void (this.environment as DevEnvironment).warmupRequest(FIRST_RENDER);
    },
    resolveId(source) {
      if (source === FIRST_RENDER) return `\0${FIRST_RENDER}`;
    },
    async load(id) {
      if (id !== `\0${FIRST_RENDER}`) return;
      await servers.get(this.environment.getTopLevelConfig())!.firstRender;
      return "export {}";
    },
    transform: {
      order: "post",
      handler() {
        if (this.environment.name !== "rsc") return;
        const { client, manager, warmed } = servers.get(this.environment.getTopLevelConfig())!;
        // Every client reference recorded so far: plugin-rsc keys some by their id with its query, some without
        for (const { importId } of Object.values(manager.clientReferenceMetaMap)) {
          if (warmed.has(importId)) continue;
          warmed.add(importId);
          // The browser's URL, unwrapped as Vite's middleware does before it transforms it
          void client.warmupRequest(importId.replace(/^\/@id\/(__x00__)?/, (_, nul) => (nul ? "\0" : "")));
        }
      },
    },
  };
}
