import rsc from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { setBrowserEnvironment } from "./plugin/browserResolver";
import { clientInServerPackageDeps } from "./plugin/clientInServerPackageDeps";
import { clientReferenceDeps } from "./plugin/clientReferenceDeps";
import { commonJsDeps } from "./plugin/commonJsDeps";
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
          // Pre-bundled, a linked copy would load twice and React would remount the Layout: plugin-rsc still loads its client components, e.g. LoadingBoundary, from their own files
          // Included, as Vite doesn't discover these imports of the excluded package once it's installed, and the browser can't load them as CommonJS
          client: { optimizeDeps: { exclude: ["vike-react-rsc", "vike-react"], include: ["react", "react/jsx-runtime"] } },
          // Vike deploys dist/server, rsc included
          rsc: { build: { outDir: `${build?.outDir ?? "dist"}/server/rsc` } },
        },
      }),
      // The client build leaves out what renders a page without a Flight, unless components is 'client'
      configEnvironment: (name, _config, { command }) => {
        if (name === "client") return { define: { __VIKE_REACT_RSC_CLIENT_DEFAULT__: String(command === "serve" || isClientDefault()) } };
      },
      // The plugins below resolve imports as the browser does
      configureServer: (server) => setBrowserEnvironment(server.environments.client!),
      // Before plugin-rsc's, which builds the envs
      buildApp: { order: "pre", handler: async (builder) => setBrowserEnvironment(builder.environments.client!) },
    },
    clientReferenceDeps(),
    clientInServerPackageDeps(),
    commonJsDeps(),
    noServerFunctionComponents(),
    noServerComponentsInBrowser(),
    placement(),
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
