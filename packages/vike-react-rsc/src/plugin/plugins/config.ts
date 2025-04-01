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
    sharedDuringBuild: false,
  },
  {
    name: "vike-rsc:config:post",
    config(): UserConfig {
      return {
        builder: {
          async buildApp(builder) {
            await builder.build(builder.environments.rsc!);
            await builder.build(builder.environments.client!);
            await builder.build(builder.environments.ssr!);
          },
        },
      };
    },
  },
];
