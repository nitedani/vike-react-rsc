import path from "node:path";
import type { Plugin } from "vite";
import { resolveForBrowser } from "./browserResolver";
import { isClientDefault, resolveComponentConfigs } from "./componentConfigs";
import { isPageEntry } from "./vikeParts";

// A client component's import, with the exports Vike reads and the file that imports it, which plugin-rsc's client reference
// imports in each env
const CLIENT_IMPORT = "virtual:vike-react-rsc/client-import:";

/** Under `'client'`, a client component that the rsc env resolves to another file than the browser, e.g. through export
 * conditions: its client reference imports, in each env, the file that env's own conditions give */
export function clientImport(): Plugin {
  return {
    name: "vike-react-rsc:client-import",
    enforce: "pre",
    resolveId: {
      // Before plugin-rsc's, which resolves the import with the react-server condition
      order: "pre",
      async handler(source, importer) {
        if (source.startsWith(`\0${CLIENT_IMPORT}`)) return source;
        if (this.environment.name !== "rsc" || !isPageEntry(importer) || !isClientDefault()) return;
        // A client component that the rsc env resolves to another file than the browser: its client reference is the import
        const clientImport = (await resolveComponentConfigs(this)).clientImports.get(source);
        if (!clientImport) return;
        const { importer: configFile, exportNames } = clientImport;
        // From the root, so the build doesn't depend on where the app is
        const query = { exports: exportNames.join(","), ...(configFile && { importer: path.relative(this.environment.config.root, configFile) }) };
        return `\0${CLIENT_IMPORT}${source}?${new URLSearchParams(query)}`;
      },
    },
    // Each env loads the file its own conditions give: the browser its file, the HTML render Node's
    async load(id) {
      if (!id.startsWith(`\0${CLIENT_IMPORT}`)) return;
      const [importPath, query] = id.slice(CLIENT_IMPORT.length + 1).split("?") as [string, string];
      const params = new URLSearchParams(query);
      const importer = params.has("importer") ? path.resolve(this.environment.config.root, params.get("importer")!) : undefined;
      const exportNames = params.get("exports")!.split(",");
      const file = this.environment.name === "client" ? await resolveForBrowser(importPath, importer) : (await this.resolve(importPath, importer))?.id;
      return `"use client";\nexport { ${exportNames.join(", ")} } from ${JSON.stringify(file ?? importPath)};\n`;
    },
  };
}
