import { PKG_NAME } from "../../constants";
import type { Plugin, UserConfig } from "vite";

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
        bla2: 23,
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
            // @ts-expect-error
            bla: 123,
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
    configResolved(c) {
      c.envPrefix
      console.log('configResolved')
      // @ts-ignore
      console.log('c.bla', c.bla)
      // @ts-ignore
      console.log('this.environment',this?.environment)
      // @ts-ignore
      console.log('c.bla2', c.bla2)
      console.log('c.build.outDir', c.build.outDir)
      console.log()
      if (c.build.outDir === 'dist/rsc') {
        // @ts-ignore
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
