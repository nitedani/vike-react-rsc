import { PKG_NAME } from "../../constants";
import type { Plugin, UserConfig } from "vite";
import type { VitePluginServerEntryOptions } from "@brillout/vite-plugin-server-entry/plugin";
import { defaultServerConditions } from "vite";

declare module "vite" {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions;
  }
}

export const configs: Plugin[] = [
  {
    name: "vike-rsc:config:pre",
    enforce: "pre",
    configEnvironment() {
      return {
        resolve: {
          noExternal: [PKG_NAME],
        },
        optimizeDeps: {
          include: ["react"],
        },
      };
    },
    config(): UserConfig {
      return {
        environments: {
          client: {
            optimizeDeps: {
              include: ["react-server-dom-webpack/client.browser"],
              exclude: ["react-server-dom-webpack", "virtual:enviroment-name"],
            },
          },
          rsc: {
            optimizeDeps: {
              include: [
                "react-dom/server.edge",
                "react-server-dom-webpack/client.edge",
              ],
            },
            build: {
              outDir: "dist/server",
              rollupOptions: {
                input: {
                  ssr: "virtual:build-ssr-entry",
                },
              },
            },
          },
          ssr: {
            resolve: {
              conditions: ["react-server", ...defaultServerConditions],
              noExternal: [
                "react",
                "react/jsx-runtime",
                "react/jsx-dev-runtime",
                "react-server-dom-webpack",
              ],
            },
            optimizeDeps: {
              include: [
                "react/jsx-runtime",
                "react/jsx-dev-runtime",
                "react-server-dom-webpack/server.edge",
              ],
            },
            build: {
              outDir: "dist/rsc",
              ssr: true,
              rollupOptions: {
                input: { index: "virtual:build-rsc-entry" },
              },
            },
          },
        },
      };
    },
    sharedDuringBuild: false,
  },
  {
    name: "vike-rsc:config-rsc",
    applyToEnvironment(env) {
      return env.name === "ssr";
    },
    config() {
      return {
        vitePluginServerEntry: {
          // dist/rsc/ shouldn't include server code (Express.js, Hono, ...)
          disableServerEntryEmit: true,
        },
      };
    },
  },
  {
    name: "vike-rsc:config:post",
    config(): UserConfig {
      return {
        builder: {
          async buildApp(builder) {
            // global.vikeReactRscGlobalState.disableUseClientPlugin = true;
            // // Discover server references in "use client" files
            // await builder.build(builder.environments.ssr!);
            // global.vikeReactRscGlobalState.disableUseClientPlugin = false;
            // await builder.build(builder.environments.ssr!);
            // await builder.build(builder.environments.client!);
            await builder.build(builder.environments.rsc!);
          },
        },
      };
    },
  },
];
