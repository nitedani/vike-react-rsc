import rsc from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { clientDefault } from "./plugin/clientDefault";
import { isClientDefault } from "./plugin/componentConfigs";
import { noServerComponentsInBrowser } from "./plugin/noServerComponentsInBrowser";
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
          // - The Vike entries they import are excluded too: Vite's scan doesn't see them, so it would find them on the first
          //   page load and reload the page, and pre-bundling them would load a second copy of Vike's client code
          client: { optimizeDeps: { exclude: ["vike-react-rsc", "vike/abort", "vike/getPageContext"] } },
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
    clientDefault(),
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
