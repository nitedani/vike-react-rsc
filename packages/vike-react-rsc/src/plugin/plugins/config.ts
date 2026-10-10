import { defaultServerConditions, type Plugin, type UserConfig } from "vite";

export const configs: Plugin[] = [
  {
    name: "vike-rsc:config:pre",
    enforce: "pre",
    config(config): UserConfig {
      return {
        environments: {
          client: {
            optimizeDeps: {
              include: [
                "react-dom/client",
              ],
              exclude: [
                "vike-react-rsc",
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
                "vike-react-rsc",
                "@vitejs/plugin-rsc",
              ],
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
                "vike-react-rsc",
                "@vitejs/plugin-rsc",
              ],
            },
            build: {
              // Inside Vike's server build, so that deploying it also deploys rsc
              outDir: `${config.build?.outDir ?? "dist"}/server/rsc`,
              ssr: true,
            },
          },
        },
      };
    },
  },
];
