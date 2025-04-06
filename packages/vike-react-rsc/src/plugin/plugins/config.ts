import { PKG_NAME } from "../../constants";
import type { Plugin, UserConfig } from "vite";
import type { VitePluginServerEntryOptions } from '@brillout/vite-plugin-server-entry/plugin'

const distRsc = 'dist/rsc'

declare module 'vite' {
  interface UserConfig {
    vitePluginServerEntry?: VitePluginServerEntryOptions
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
          ssr: {
            optimizeDeps: {
              include: [
                "react-dom/server.edge",
                "react-server-dom-webpack/client.edge",
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
            // Doesn't work, see [VITE-ENV-CONFIG-DIRTY-HACK]
            // @ts-ignore
            vitePluginServerEntry: {
              disableServerEntryEmit: true
            },
            resolve: {
              conditions: ["react-server"],
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
    configResolved(c) {
      // See [VITE-ENV-CONFIG-DIRTY-HACK]
      if (c.build.outDir === distRsc) {
        // @ts-ignore
        c.vitePluginServerEntry ??= {}
        c.vitePluginServerEntry.disableServerEntryEmit = true
      }
    },
    sharedDuringBuild: false,
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
