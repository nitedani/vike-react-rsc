import {
  type Plugin,
  type ResolvedConfig,
  type ViteDevServer,
  type UserConfig,
  type RunnableDevEnvironment,
} from "vite";
import type { ModuleRunner } from "vite/module-runner";

// Store server instance for runner access in hooks
let devServer: ViteDevServer;
const globalKey = Symbol.for("vite-plugin-vike-rsc-minimal:devServer");

export default function vikeRscPluginMinimal(): Plugin[] {
  let resolvedConfig: ResolvedConfig;

  return [
    {
      name: "vike-rsc-minimal:config",
      enforce: "pre",
      config(): UserConfig {
        return {
          environments: {
            client: {
              optimizeDeps: {
                include: [
                  "react",
                  "react-dom/client",
                  "react-server-dom-webpack/client.browser",
                ],
                exclude: ["react-server-dom-webpack"], // May need exclusion if causing CJS/ESM issues
              },
            },
            ssr: {
              optimizeDeps: {
                include: [
                  "react",
                  "react-dom/server.edge",
                  "react-server-dom-webpack/client.edge",
                ],
              },
              resolve: {
                // noExternal: [/react-server-dom-webpack/, "react", "react-dom"],
              },
            },
            rsc: {
              // dev: {
              //   createEnvironment: (name, config) =>
              //     createRunnableDevEnvironment(name, config),
              // },
              resolve: {
                conditions: ["react-server"],
                noExternal: [
                  /react-server-dom-webpack/,
                  "react",
                  "react/jsx-runtime",
                  "react/jsx-dev-runtime",
                ],
              },
              optimizeDeps: {
                include: [
                  "react",
                  "react/jsx-runtime",
                  "react/jsx-dev-runtime",
                  "react-server-dom-webpack/server.edge",
                ],
                exclude: ["react-server-dom-webpack"],
              },
              build: {
                outDir: "dist/rsc",
                ssr: true,
                // rollupOptions: { input: { rsc: "???" } },
              },
            },
          },
        };
      },
      configResolved(config) {
        resolvedConfig = config;
      },
      configureServer(server) {
        devServer = server;
        (globalThis as any)[globalKey] = devServer;

        // Initialize runners (accessing them does this)
        try {
          if (server.environments.rsc)
            (server.environments.rsc as RunnableDevEnvironment).runner;
          if (server.environments.ssr)
            (server.environments.ssr as RunnableDevEnvironment).runner;
          console.log("[RSC Plugin] Dev server runners accessed/initialized.");
        } catch (e) {
          console.error("[RSC Plugin] Failed to initialize runners:", e);
        }
      },
    },
    // No virtual modules in this minimal version
  ];
}

// Helper to access the server instance from hooks
export function getDevServerInstance(): ViteDevServer | undefined {
  return (globalThis as any)[globalKey];
}

// Helper to access the specifically created RSC runner
export function getRscRunner(): ModuleRunner | undefined {
  const server = getDevServerInstance();
  const rscEnv = server?.environments.rsc as RunnableDevEnvironment | undefined;
  return rscEnv?.runner;
}
