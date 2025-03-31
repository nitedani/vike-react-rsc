import type { Plugin, RunnableDevEnvironment } from "vite";

export const exposeDevServer: Plugin = {
  name: "rsc-dev",
  configureServer(server) {
    global.vikeReactRscGlobalState.devServer = server;
    try {
      if (server.environments.rsc)
        (server.environments.rsc as RunnableDevEnvironment).runner;
      if (server.environments.ssr)
        (server.environments.ssr as RunnableDevEnvironment).runner;
      console.log("[RSC Plugin] Dev server runners initialized");
    } catch (e) {
      console.error("[RSC Plugin] Failed to initialize runners:", e);
    }
  },
};
