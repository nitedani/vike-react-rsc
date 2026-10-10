import rsc from "@vitejs/plugin-rsc";
import { defaultServerConditions, type Plugin, type UserConfig } from "vite";

export function vikeRscPlugin(): Plugin[] {
  return [
    {
      name: "vike-react-rsc:config",
      enforce: "pre",
      config(config): UserConfig {
        return {
          environments: {
            client: {
              optimizeDeps: {
                include: ["react-dom/client"],
                exclude: ["vike-react-rsc", "@vitejs/plugin-rsc"],
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
                exclude: ["vike-react-rsc", "@vitejs/plugin-rsc"],
              },
            },
            rsc: {
              resolve: {
                conditions: ["react-server", ...defaultServerConditions],
              },
              optimizeDeps: {
                include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
                exclude: ["vike-react-rsc", "@vitejs/plugin-rsc"],
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
    ...rsc({
      serverHandler: false,
      // Vike owns the HTML, so the client build has no index.html entry chunk for plugin-rsc to bootstrap from
      customClientEntry: true,
    }),
  ];
}
