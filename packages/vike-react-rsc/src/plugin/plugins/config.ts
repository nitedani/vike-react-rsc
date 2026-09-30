import { PKG_NAME } from "../../constants";
import { defaultServerConditions, type Plugin, type UserConfig } from "vite";
import { type VitePluginServerEntryOptions } from "@brillout/vite-plugin-server-entry/plugin";

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
              ],
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
  },
];
