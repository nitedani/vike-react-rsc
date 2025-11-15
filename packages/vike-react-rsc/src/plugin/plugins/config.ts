import { PKG_NAME } from "../../constants";
import { defaultServerConditions, type Plugin, type UserConfig } from "vite";
import type { VitePluginServerEntryOptions } from "@brillout/vite-plugin-server-entry/plugin";

const distRsc = "dist/rsc";

declare module "vite" {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions;
  }
}

export const configs: Plugin[] = [
  {
    name: "vike-rsc:config:pre",
    enforce: "pre",
    config(): UserConfig {
      const noExternal = [
        "react",
        "react-dom",
        PKG_NAME,
        "@vitejs/plugin-rsc",
        "react-streaming",
      ];

      return {
        environments: {
          client: {
            optimizeDeps: {
              include: [
                "react-dom/client",
                "@vitejs/plugin-rsc/vendor/react-server-dom/client.browser",
              ],
              exclude: [
                PKG_NAME,
                "@vitejs/plugin-rsc",
                "virtual:enviroment-name",
              ],
            },
          },
          ssr: {
            optimizeDeps: {
              include: [
                "react",
                "react-dom",
                "react/jsx-runtime",
                "react/jsx-dev-runtime",
                "react-dom/server.edge",
                "react-dom/static.edge",
                "react-streaming/server.web",
                "@vitejs/plugin-rsc/vendor/react-server-dom/client.edge",
              ],
              exclude: [
                PKG_NAME,
                "@vitejs/plugin-rsc",
                "virtual:enviroment-name",
              ],
            },
            resolve: {
              noExternal,
            },
            build: {
              rollupOptions: {
                input: {
                  ssr: "virtual:build-ssr-entry",
                },
              },
            },
          },
          rsc: {
            resolve: {
              conditions: ["react-server", ...defaultServerConditions],
              noExternal,
            },
            optimizeDeps: {
              include: [
                "react",
                "react-dom",
                "react/jsx-runtime",
                "react/jsx-dev-runtime",
                "@vitejs/plugin-rsc/vendor/react-server-dom/server.edge",
                "@vitejs/plugin-rsc/vendor/react-server-dom/client.edge",
              ],
              exclude: [
                PKG_NAME,
                "@vitejs/plugin-rsc",
                "virtual:enviroment-name",
              ],
            },
            build: {
              outDir: distRsc,
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
      return env.name === "rsc";
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
            global.vikeReactRscGlobalState.disableUseClientPlugin = true;
            // Discover server references in "use client" files
            await builder.build(builder.environments.rsc!);
            global.vikeReactRscGlobalState.disableUseClientPlugin = false;
            await builder.build(builder.environments.rsc!);
            await builder.build(builder.environments.client!);
            await builder.build(builder.environments.ssr!);
          },
        },
      };
    },
  },
];
