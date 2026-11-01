import rsc from "@vitejs/plugin-rsc";
import path from "node:path";
import { normalizePath, type Plugin } from "vite";
import { resolveForBrowser, setBrowserEnvironment } from "./plugin/browserResolver";
import { findClientReferences } from "./plugin/clientReferences";
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
          // These packages are served unbundled: the scan doesn't reach vike-react-rsc's own "use client" files, or its vike-react
          // alias's, so Vite would pre-bundle them late and reload the page. A linked copy would also load the page store and rsc()'s cache twice
          client: { optimizeDeps: { exclude: ["vike-react-rsc", "vike-react"] } },
          // Vike deploys dist/server, rsc included
          rsc: { build: { outDir: `${build?.outDir ?? "dist"}/server/rsc` } },
        },
      }),
      // The client build leaves out what renders a page without a Flight, unless components is 'client'
      configEnvironment: (name, _config, { command }) => {
        if (name === "client") return { define: { __VIKE_REACT_RSC_CLIENT_DEFAULT__: String(command === "serve" || isClientDefault()) } };
      },
      configureServer: async (server) => {
        const client = server.environments.client!;
        // The plugins below resolve imports as the browser does
        setBrowserEnvironment(client);
        // Vike's client entries don't reach what the browser loads through server components' client references, so it is added
        // before the optimizer starts: else Vite pre-bundles it late and reloads the page, with "Invalid hook call" until then
        const { root, build } = server.config;
        const { optimizeDeps } = client.config;
        const { files, packageImports } = await findClientReferences(root, path.resolve(root, build.outDir), client.config, resolveForBrowser);
        // Vite reads each entry as a glob, so a path's glob characters, as in a route group's (marketing), are escaped
        optimizeDeps.entries = [...[optimizeDeps.entries ?? []].flat(), ...files.map((file) => normalizePath(file).replace(/[()[\]{}*?|]/g, "\\$&"))];
        // Vite pre-bundles what include lists even when exclude lists it or its package
        const isExcluded = (source: string) => [source, getPackageName(source)].some((id) => optimizeDeps.exclude?.includes(id));
        optimizeDeps.include = [...(optimizeDeps.include ?? []), ...packageImports.filter((source) => !isExcluded(source))];
      },
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

function getPackageName(source: string): string {
  return source.split("/").slice(0, source.startsWith("@") ? 2 : 1).join("/");
}
