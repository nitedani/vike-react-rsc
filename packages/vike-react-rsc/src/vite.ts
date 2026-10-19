import rsc from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { clientDefault, isClientDefault, usesLoadingBoundary } from "./plugin/clientDefault";
import { noServerComponentsInBrowser } from "./plugin/noServerComponentsInBrowser";
import { noServerFunctionComponents } from "./plugin/noServerFunctionComponents";

// getPageElement() imports it: LoadingBoundary in an app that needs it, so an app without a client +Loading doesn't ship it
const LOADING_BOUNDARY = "virtual:vike-react-rsc/LoadingBoundary";

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
          // - Vite's scan doesn't see what the excluded entries import, so it would find vike/getPageContext on the first page
          //   load, then reload the page
          client: { optimizeDeps: { exclude: ["vike-react-rsc"], include: ["vike/getPageContext"] } },
          // Vike deploys dist/server, rsc included
          rsc: { build: { outDir: `${build?.outDir ?? "dist"}/server/rsc` } },
        },
      }),
      // The client build leaves out what renders a page without a Flight, unless components is 'client'
      configEnvironment: (name, _config, { command }) => {
        if (name === "client") return { define: { __VIKE_REACT_RSC_CLIENT_DEFAULT__: String(command === "serve" || isClientDefault()) } };
      },
    },
    {
      name: "vike-react-rsc:loading-boundary",
      resolveId: (id) => (id === LOADING_BOUNDARY ? `\0${LOADING_BOUNDARY}` : undefined),
      // The same answer in every env. In dev always: the page looks the same, and adding a client +Loading needs no restart.
      async load(id) {
        if (id !== `\0${LOADING_BOUNDARY}`) return;
        const { command, root } = this.environment.config;
        if (command === "build" && !(await usesLoadingBoundary(root))) return "export const LoadingBoundary = undefined;";
        return `export { LoadingBoundary } from "vike-react-rsc/__internal/LoadingBoundary";`;
      },
    },
    noServerFunctionComponents(),
    noServerComponentsInBrowser(),
    clientDefault(),
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
