import rsc from "@vitejs/plugin-rsc";
import path from "node:path";
import { normalizePath, type Plugin } from "vite";
import { setBrowserEnvironment } from "./plugin/browserResolver";
import { findClientComponentFiles } from "./plugin/clientComponentFiles";
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
      config: async (config, { command, isPreview }) => {
        const root = path.resolve(config.root ?? "");
        const outDir = config.build?.outDir ?? "dist";
        // Only server components import a "use client" file, so Vite's scan starts from the app's ones too: else Vite would pre-bundle
        // what they import when the browser first loads them, then reload the page, with "Invalid hook call" until the reload
        const files = command === "serve" && !isPreview ? await findClientComponentFiles(root, path.resolve(root, outDir)) : [];
        // Vite reads each entry as a glob, so a path's glob characters, as in a route group's (marketing), are escaped
        const entries = files.map((file) => normalizePath(file).replace(/[()[\]{}*?|]/g, "\\$&"));
        return {
          environments: {
            // The scan doesn't reach vike-react-rsc's own "use client" files, or its vike-react alias's, so Vite serves these packages
            // unbundled. A linked copy would also load the page store and rsc()'s cache twice
            client: { optimizeDeps: { entries, exclude: ["vike-react-rsc", "vike-react"] } },
            // Vike deploys dist/server, rsc included
            rsc: { build: { outDir: `${outDir}/server/rsc` } },
          },
        };
      },
      // The client build leaves out what renders a page without a Flight, unless components is 'client'
      configEnvironment: (name, _config, { command }) => {
        if (name === "client") return { define: { __VIKE_REACT_RSC_CLIENT_DEFAULT__: String(command === "serve" || isClientDefault()) } };
      },
      // The plugins below resolve imports as the browser does
      configureServer: (server) => setBrowserEnvironment(server.environments.client!),
      // Before plugin-rsc's, which builds the envs
      buildApp: { order: "pre", handler: async (builder) => setBrowserEnvironment(builder.environments.client!) },
    },
    noServerFunctionComponents(),
    noServerComponentsInBrowser(),
    placement(),
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
