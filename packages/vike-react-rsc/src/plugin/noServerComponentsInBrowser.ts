import path from "node:path";
import type { Plugin } from "vite";
import { getComponentConfig } from "./clientDefault";
import { getDirectives, getFile, isAppFile, parse } from "./parse";

/** The browser importing a `"use server component"` file is an error, in dev and in the build, naming each Page, Layout, Wrapper or Loading that imports
 * it and the files in between. A Page, Layout, Wrapper or Loading with the directive is skipped: the browser gets at most a stub of it (see getServerComponentStub) */
export function noServerComponentsInBrowser(): Plugin {
  // The server component files the client build imports
  const serverComponentsInBrowser = new Set<string>();
  return {
    name: "vike-react-rsc:no-server-components-in-browser",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      if (getComponentConfig(id)) return;
      if (!isAppFile(id) || this.environment.name !== "client" || !(await isServerComponentFile(code, id))) return;
      // The build knows every importer once it has loaded all modules
      if (this.environment.mode !== "dev") {
        serverComponentsInBrowser.add(id);
        return;
      }
      const { moduleGraph } = this.environment;
      const chains = getImportChains(id, (id) => [...(moduleGraph.getModuleById(id)?.importers ?? [])].flatMap((importer) => importer.id ?? []));
      this.error(getServerComponentInBrowserErrors(chains, this.environment.config.root));
    },
    buildEnd() {
      if (this.environment.name !== "client") return;
      for (const id of serverComponentsInBrowser) {
        const chains = getImportChains(id, (id) => [...(this.getModuleInfo(id)?.importers ?? [])]);
        this.error(getServerComponentInBrowserErrors(chains, this.environment.config.root));
      }
    },
  };
}

async function isServerComponentFile(code: string, id: string): Promise<boolean> {
  return code.includes("use server component") && getDirectives(await parse(code, id)).includes("use server component");
}

// Each way from `id` up its importers to a Page, Layout, Wrapper or Loading, or to a file the app's code doesn't import, the way
// plugin-rsc reports server-only. Every page that imports it, not just the first: in dev, the one the browser opens.
function getImportChains(id: string, getImporters: (id: string) => string[]): string[][] {
  const chains: string[][] = [];
  const walk = (chain: string[]) => {
    const file = chain.at(-1)!;
    const importers = getComponentConfig(file) ? [] : getImporters(file).filter((importer) => isAppFile(importer) && !chain.includes(importer));
    if (importers.length === 0) chains.push(chain);
    for (const importer of importers) walk([...chain, importer]);
  };
  walk([id]);
  return chains;
}

function getServerComponentInBrowserErrors(chains: string[][], root: string): string {
  return [...new Set(chains.map((chain) => getServerComponentInBrowserError(chain, root)))].join("\n");
}

// A server component renders only on the server. A component in the browser shows one through rsc(); a Page, Layout, Wrapper or Loading that needs
// nothing from the browser can render it as a server component instead.
function getServerComponentInBrowserError(chain: string[], root: string): string {
  const [file, ...importers] = chain.map((id) => path.relative(root, getFile(id)));
  const importer = importers.pop();
  if (!importer) return `${file} starts with "use server component", but the browser loads it`;
  const through = importers.length > 0 ? ` through ${importers.reverse().join(", ")}` : "";
  const toServer = getComponentConfig(chain.at(-1)!)
    ? `if ${importer} needs nothing from the browser (no hooks, no event handlers), start it with "use server component"`
    : "import it only from server components";
  const typesOnly = `if ${path.relative(root, getFile(chain[1]!))} imports only its types, write \`import type\``;
  return (
    `${file} starts with "use server component", but the browser loads it: ${importer} imports it${through}. ` +
    `To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ` +
    `or, ${toServer}; or, ${typesOnly}`
  );
}
