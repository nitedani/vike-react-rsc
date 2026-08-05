import { PKG_NAME } from "../../constants";
import { defaultServerConditions, type Plugin, type UserConfig } from "vite";
import {
  serverEntryVirtualId,
  type VitePluginServerEntryOptions,
} from "@brillout/vite-plugin-server-entry/plugin";

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
              ],
              exclude: [
                PKG_NAME,
                "@vitejs/plugin-rsc",
                "virtual:environment-name",
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
              ],
              exclude: [
                PKG_NAME,
                "@vitejs/plugin-rsc",
                "virtual:environment-name",
              ],
            },
            resolve: {
              noExternal,
            },
            build: {
              rollupOptions: {
                input: {
                  ssr: "virtual:build-ssr-entry",
                  // @brillout/vite-plugin-server-entry gates its own input injection on
                  // the ROOT build.ssr flag, which is false under plugin-rsc's
                  // multi-environment build, but gates the hooks that consume that input
                  // per-environment (consumer !== 'client'). So it asserts in
                  // generateBundle for an entry it never injected. Declare it ourselves.
                  entry: serverEntryVirtualId,
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
              ],
              exclude: [
                PKG_NAME,
                "@vitejs/plugin-rsc",
                "virtual:environment-name",
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
    sharedDuringBuild: true,
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
];
