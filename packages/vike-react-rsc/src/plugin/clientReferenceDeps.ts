import { getPluginApi } from "@vitejs/plugin-rsc";
import type { Connect, DevEnvironment, Environment, Plugin } from "vite";

const HOLD = "virtual:vike-react-rsc/first-render";

/** In dev, Vite pre-bundles in its first batch what the browser imports through the page's client references. Vike's client entries,
 * which Vite scans, don't import them, so Vite would find them only once the browser does, pre-bundle them late and reload the page,
 * with "Invalid hook call" until then. So the client env loads each client reference plugin-rsc creates as the browser will, and the
 * first batch waits until the first page's response ends */
export function clientReferenceDeps(): Plugin {
  let client: DevEnvironment;
  // One per server: on a restart, Vite creates the new server before it closes the old one
  const firstRenders = new WeakMap<Environment, Promise<void>>();
  return {
    name: "vike-react-rsc:client-reference-deps",
    apply: "serve",
    configureServer(server) {
      client = server.environments.client!;
      let resolveFirstRender!: () => void;
      const firstRender = new Promise<void>((resolve) => (resolveFirstRender = resolve));
      firstRenders.set(client, firstRender);
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
        await server.environments.client!.waitForRequestsIdle();
        return close();
      };
    },
    // Vite's first batch waits until the client env has no pending request, so this one holds it
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
      handler(_code, id) {
        if (this.environment.name !== "rsc") return;
        const meta = getPluginApi(this.environment.getTopLevelConfig())!.manager.clientReferenceMetaMap[id.split("?")[0]!];
        // The browser's URL, unwrapped as Vite's middleware does before it transforms it
        if (meta) void client.warmupRequest(meta.importId.replace(/^\/@id\/(__x00__)?/, (_, nul) => (nul ? "\0" : "")));
      },
    },
  };
}
