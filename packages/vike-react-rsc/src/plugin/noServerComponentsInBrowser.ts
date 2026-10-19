import path from "node:path";
import type { Plugin } from "vite";
import { getDirectives, getFile, isAppFile, isPlusComponentFile, parse } from "./parse";

/** The browser importing a `"use server component"` file is an error, in dev and in the build, naming the importers and the + file
 * to mark. A + file with the directive is skipped: the browser gets at most a stub of it (see getServerComponentStub) */
export function noServerComponentsInBrowser(): Plugin {
  // The server component files the client build imports
  const serverComponentsInBrowser = new Set<string>();
  return {
    name: "vike-react-rsc:no-server-components-in-browser",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      if (isPlusComponentFile(id)) return;
      if (!isAppFile(id) || this.environment.name !== "client" || !(await isServerComponentFile(code, id))) return;
      // The build knows every importer once it has loaded all modules
      if (this.environment.mode !== "dev") {
        serverComponentsInBrowser.add(id);
        return;
      }
      const { moduleGraph } = this.environment;
      const chain = getImportChain(id, (id) => [...(moduleGraph.getModuleById(id)?.importers ?? [])][0]?.id ?? undefined);
      this.error(getServerComponentInBrowserError(chain, this.environment.config.root));
    },
    buildEnd() {
      if (this.environment.name !== "client") return;
      for (const id of serverComponentsInBrowser) {
        const chain = getImportChain(id, (id) => this.getModuleInfo(id)?.importers[0]);
        this.error(getServerComponentInBrowserError(chain, this.environment.config.root));
      }
    },
  };
}

async function isServerComponentFile(code: string, id: string): Promise<boolean> {
  return code.includes("use server component") && getDirectives(await parse(code, id)).includes("use server component");
}

// `id`, then its first importer, and so on up to the first + file of a component, the way plugin-rsc reports server-only
function getImportChain(id: string, getImporter: (id: string) => string | undefined): string[] {
  const chain: string[] = [];
  for (let next: string | undefined = id; next && isAppFile(next) && !chain.includes(next); next = getImporter(next)) {
    chain.push(next);
    if (isPlusComponentFile(next)) break;
  }
  return chain;
}

// A server component renders only on the server. A component in the browser shows one through rsc(); a + file that needs
// nothing from the browser can render it as a server component instead.
function getServerComponentInBrowserError(chain: string[], root: string): string {
  const [file, ...importers] = chain.map((id) => path.relative(root, getFile(id)));
  const importer = importers.pop();
  if (!importer) return `${file} starts with "use server component", but the browser loads it`;
  const through = importers.length > 0 ? ` through ${importers.reverse().join(", ")}` : "";
  const toServer = isPlusComponentFile(chain.at(-1)!)
    ? `if ${importer} needs nothing from the browser (no hooks, no event handlers), start it with "use server component"`
    : "import it only from server components";
  const typesOnly = `if ${path.relative(root, getFile(chain[1]!))} imports only its types, write \`import type\``;
  return (
    `${file} starts with "use server component", but the browser loads it: ${importer} imports it${through}. ` +
    `To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ` +
    `or, ${toServer}; or, ${typesOnly}`
  );
}
