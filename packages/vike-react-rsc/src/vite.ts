import rsc from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { isClientDefault } from "./plugin/componentConfigs";
import { noServerComponentsInBrowser } from "./plugin/noServerComponentsInBrowser";
import { noServerFunctionComponents } from "./plugin/noServerFunctionComponents";
import { placement } from "./plugin/placement";

export function vikeReactRscPlugins(): Plugin[] {
  return [
    {
      name: "vike-react-rsc:environments",
      // plugin-rsc's config hook reads the rsc outDir
      enforce: "pre",
      config: ({ build }) => ({
        environments: {
          // vike-react-rsc ships "use client" modules, which Vite's scan finds only on the first request, so plugin-rsc
          // asks to exclude it: an installed app can reload its first page with "Invalid hook call". A linked copy would
          // also load the page store and rsc()'s cache twice
          client: { optimizeDeps: { exclude: ["vike-react-rsc"] } },
          // Vike deploys dist/server, rsc included
          rsc: { build: { outDir: `${build?.outDir ?? "dist"}/server/rsc` } },
        },
      }),
      // The client build leaves out what renders a page without a Flight, unless components is 'client'
      configEnvironment: (name, _config, { command }) => {
        if (name === "client") return { define: { __VIKE_REACT_RSC_CLIENT_DEFAULT__: String(command === "serve" || isClientDefault()) } };
      },
    },
    noServerFunctionComponents(),
    noServerComponentsInBrowser(),
    placement(),
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
