import rsc from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { clientDefault } from "./plugin/clientDefault";
import { keepClientOnlyChildren } from "./plugin/keepClientOnlyChildren";
import { noServerFunctionComponents } from "./plugin/noServerFunctionComponents";

export function vikeReactRscPlugins(): Plugin[] {
  return [
    {
      name: "vike-react-rsc:environments",
      // plugin-rsc's config hook reads the rsc outDir
      enforce: "pre",
      config: ({ build }) => ({
        environments: {
          // Vike pre-bundles the entry its hooks import, but not the other entries of a linked copy, so the browser
          // would load the page store and rsc()'s cache twice
          client: { optimizeDeps: { exclude: ["vike-react-rsc"] } },
          // Vike deploys dist/server, rsc included
          rsc: { build: { outDir: `${build?.outDir ?? "dist"}/server/rsc` } },
        },
      }),
    },
    noServerFunctionComponents(),
    clientDefault(),
    keepClientOnlyChildren(),
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
