import rsc from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";

export function vikeReactRscPlugins(): Plugin[] {
  return [
    {
      name: "vike-react-rsc:environments",
      // plugin-rsc's config hook reads the rsc outDir
      enforce: "pre",
      config: ({ build }) => ({
        environments: {
          // Pre-bundling would copy @vitejs/plugin-rsc/browser into this package's bundle, and callServer() would
          // then register on a copy that React's server functions don't call
          client: { optimizeDeps: { exclude: ["vike-react-rsc"] } },
          // Vike deploys dist/server, rsc included
          rsc: { build: { outDir: `${build?.outDir ?? "dist"}/server/rsc` } },
        },
      }),
    },
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
