import type { DevEnvironment, Plugin } from "vite";

const PROXY = "\0virtual:vite-rsc/client-in-server-package-proxy/";

/** In dev, plugin-rsc imports a package's "use client" file by its path when no import names it, e.g. @mui/material/Button's entry
 * re-exports ./Button.js. Vite pre-bundles neither that file nor what it imports, so the browser loads them as they are, and a CommonJS
 * one fails to link: the page stays blank. So the client env pre-bundles that file, as it pre-bundles a package import.
 * A package in the client env's optimizeDeps.exclude stays as it is, as Vite leaves it, so the browser still loads one copy of it.
 * TODO: remove once plugin-rsc imports such a file through the client env's pre-bundle */
export function clientInServerPackageDeps(): Plugin {
  return {
    name: "vike-react-rsc:client-in-server-package-deps",
    apply: "serve",
    resolveId: {
      // Before Vite's resolver, which would load the file as it is
      order: "pre",
      handler(source, importer) {
        if (this.environment.name !== "client" || !importer?.startsWith(PROXY)) return;
        const { depsOptimizer } = this.environment as DevEnvironment;
        if (!depsOptimizer) return;
        // Vite names a pre-bundle by its import, here the package name and the file's path in it, e.g. @mui/material/esm/Button/Button.js
        const id = source.slice(source.lastIndexOf("/node_modules/") + "/node_modules/".length);
        if (depsOptimizer.options.exclude?.some((pkg) => id === pkg || id.startsWith(pkg + "/"))) return;
        return depsOptimizer.getOptimizedDepId(depsOptimizer.registerMissingImport(id, source));
      },
    },
  };
}
