import { getPluginApi, type RscPluginManager } from "@vitejs/plugin-rsc";
import type { Connect, DevEnvironment, Environment, Plugin } from "vite";

const HOLD = "virtual:vike-react-rsc/first-render";

/** In dev, Vite pre-bundles in its first batch what the browser imports through the page's client references. Vike's client entries,
 * which Vite scans, don't import them, so Vite would find them only once the browser does, pre-bundle them late and reload the page,
 * with "Invalid hook call" until then. So the client env loads each client reference plugin-rsc creates as the browser will, and the
 * first batch waits until the first page's response ends */
export function clientReferenceDeps(): Plugin {
  let client: DevEnvironment;
  let manager: RscPluginManager;
  let warmed: Set<string>;
  // One per server: on a restart, Vite creates the new server before it closes the old one
  const firstRenders = new WeakMap<Environment, Promise<void>>();
  return {
    name: "vike-react-rsc:client-reference-deps",
    apply: "serve",
    configureServer(server) {
      const env = (client = server.environments.client!);
      manager = getPluginApi(server.config)!.manager;
      warmed = new Set();
      let resolveFirstRender!: () => void;
      const firstRender = new Promise<void>((resolve) => (resolveFirstRender = resolve));
      firstRenders.set(env, firstRender);
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
        await env.waitForRequestsIdle();
        return close();
      };
    },
    // On a cold cache, Vite's first batch waits until the client env has no pending request, so this one holds it
    buildStart() {
      if (this.environment.name === "client") void (this.environment as DevEnvironment).warmupRequest(HOLD);
    },
    resolveId(source) {
      if (source === HOLD) return `\0${HOLD}`;
    },
    async load(id) {
      if (id !== `\0${HOLD}`) return;
      await firstRenders.get(this.environment);
      return "export {}";
    },
    transform: {
      order: "post",
      handler() {
        if (this.environment.name !== "rsc") return;
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
