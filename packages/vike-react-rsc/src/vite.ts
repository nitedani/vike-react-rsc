import rsc from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { setBrowserEnvironment } from "./plugin/browserResolver";
import { clientApisOnServer } from "./plugin/clientApisOnServer";
import { clientInServerPackageDeps } from "./plugin/clientInServerPackageDeps";
import { clientReferenceDeps } from "./plugin/clientReferenceDeps";
import { commonJsDeps } from "./plugin/commonJsDeps";
import { isClientDefault } from "./plugin/componentConfigs";
import { noServerComponentsInBrowser } from "./plugin/noServerComponentsInBrowser";
import { noServerFunctionComponents } from "./plugin/noServerFunctionComponents";
import { pageAssets } from "./plugin/pageAssets";
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
          // Included from vike-react-rsc, where React resolves even when the app's root has none: Vite doesn't discover these imports of the excluded package once it's installed, and the browser can't load them as CommonJS
          client: { optimizeDeps: { exclude: ["vike-react-rsc", "vike-react"], include: ["vike-react-rsc > react", "vike-react-rsc > react/jsx-runtime"] } },
          rsc: {
            build: {
              // Vike deploys dist/server, rsc included
              outDir: `${build?.outDir ?? "dist"}/server/rsc`,
              // Vike's file names: with them Vike recognizes a font's .woff fallback of its .woff2, and doesn't preload it
              rolldownOptions: { output: { assetFileNames: `${build?.assetsDir ?? "assets"}/static/[name].[hash][extname]` } },
            },
          },
        },
      }),
      // The client build leaves out what renders a page without a Flight, unless components is 'client'
      configEnvironment: (name, _config, { command }) => {
        if (name === "client") return { define: { __VIKE_REACT_RSC_CLIENT_DEFAULT__: String(command === "serve" || isClientDefault()) } };
      },
      // The server runs the rsc env's output, so with @cloudflare/vite-plugin both run in the Worker, whose envs bundle every package
      configResolved({ plugins, environments: { ssr, rsc } }) {
        const isCloudflare = plugins.some((plugin) => plugin.name === "vite-plugin-cloudflare");
        if (isCloudflare && ssr?.resolve.noExternal === true && rsc?.resolve.noExternal !== true) {
          throw new Error(
            "[vike-react-rsc] @cloudflare/vite-plugin runs the ssr environment in a Worker, but not the rsc environment, which the server runs: " +
              'add it with cloudflare({ viteEnvironment: { name: "ssr", childEnvironments: ["rsc"] } })',
          );
        }
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
    clientApisOnServer(),
    pageAssets(),
    // Vike handles the requests and the client entry
    ...rsc({ serverHandler: false, customClientEntry: true }),
  ];
}
