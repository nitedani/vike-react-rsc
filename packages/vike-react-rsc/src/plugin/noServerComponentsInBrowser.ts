import type { Plugin } from "vite";
import { getComponentConfigs } from "./componentConfigs";
import { getFile, getFileName, isAppFile, isModuleFile, startsWithDirective } from "./parse";
import { findPackageServerComponentImport, getModule, importsServerComponent, type Context } from "./serverComponentImports";

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
      if (!isModuleFile(id) || this.environment.name !== "client") return;
      const getComponentConfig = await getComponentConfigs(this);
      if (getComponentConfig(id)) return;
      const { environment } = this;
      if (environment.mode !== "dev") {
        // The build knows every importer once it has loaded all modules
        if (await startsWithDirective(code, id, "use server component")) serverComponentsInBrowser.add(id);
        return;
      }
      // In dev, the browser loads a package as Vite pre-bundled it, from the package's file the import names
      const preBundled = Object.values(environment.depsOptimizer?.metadata.optimized ?? {}).find(({ file }) => file === getFile(id))?.src;
      const serverComponentImport = preBundled
        ? await findPackageServerComponentImport(preBundled, environment.getTopLevelConfig())
        : (await startsWithDirective(code, id, "use server component")) && [id];
      if (!serverComponentImport) return;
      const { moduleGraph } = environment;
      const chains = getImportChains(id, getComponentConfig, (id) => [...(moduleGraph.getModuleById(id)?.importers ?? [])].flatMap((importer) => importer.id ?? []));
      const fromServerComponent = serverComponentImport.toReversed();
      this.error(await getServerComponentInBrowserErrors(chains.map(([, ...importers]) => [...fromServerComponent, ...importers]), getComponentConfig, this));
    },
    async buildEnd() {
      if (this.environment.name !== "client") return;
      const getComponentConfig = await getComponentConfigs(this);
      for (const id of serverComponentsInBrowser) {
        const chains = getImportChains(id, getComponentConfig, (id) => {
          const { importers = [], dynamicImporters = [] } = this.getModuleInfo(id) ?? {};
          return [...importers, ...dynamicImporters];
        });
        this.error(await getServerComponentInBrowserErrors(chains, getComponentConfig, this));
      }
    },
  };
}

type GetComponentConfig = Awaited<ReturnType<typeof getComponentConfigs>>;

// Each way from `id` up its importers to a Page, Layout, Wrapper or Loading, or to a file the app's code doesn't import, the way
// plugin-rsc reports server-only. Every page that imports it, not just the first: in dev, the one the browser opens.
function getImportChains(id: string, getComponentConfig: GetComponentConfig, getImporters: (id: string) => string[]): string[][] {
  const chains: string[][] = [];
  const walk = (chain: string[]) => {
    const file = chain.at(-1)!;
    const importers = getComponentConfig(file) ? [] : getImporters(file).filter((importer) => isModuleFile(importer) && !chain.includes(importer));
    if (importers.length === 0) chains.push(chain);
    for (const importer of importers) walk([...chain, importer]);
  };
  walk([id]);
  return chains;
}

async function getServerComponentInBrowserErrors(chains: string[][], getComponentConfig: GetComponentConfig, context: Context): Promise<string> {
  const errors = await Promise.all(chains.map((chain) => getServerComponentInBrowserError(chain, getComponentConfig, context)));
  return [...new Set(errors)].join("\n");
}

// A server component renders only on the server, and so does a file without a directive that imports one. A component in the
// browser shows one through rsc(); a file that says "use client" can't import one.
async function getServerComponentInBrowserError(chain: string[], getComponentConfig: GetComponentConfig, context: Context): Promise<string> {
  const [file, ...importers] = chain.map((id) => getFileName(id, context.environment.config.root));
  if (importers.length === 0) return `${file} starts with "use server component", but the browser loads it`;
  // The file that puts the chain in the browser, or else the file at its top
  const clientIndex = (await Promise.all(chain.slice(1).map((id) => isClientComponentFile(id, context)))).indexOf(true);
  const index = clientIndex === -1 ? importers.length - 1 : clientIndex;
  const importer = importers[index]!;
  const through = index > 0 ? ` through ${importers.slice(0, index).reverse().join(", ")}` : "";
  const imports = clientIndex === -1 ? "imports" : 'starts with "use client" and imports';
  const moveHooks = ', and move its hooks and event handlers into their own "use client" component';
  // Without "use client", a Page, Layout, Wrapper or Loading that imports a server component, not by import(), runs on the server; any other file where its importer runs
  const toServer =
    clientIndex === -1
      ? getComponentConfig(chain.at(-1)!)
        ? `if ${importer} needs nothing from the browser (no hooks, no event handlers), start it with "use server component"`
        : "import it only from server components"
      : !(await importsServerComponent(getFile(chain[index + 1]!), context))
        ? `replace "use client" in ${importer} with "use server component"${moveHooks}`
        : getComponentConfig(chain[index + 1]!)
          ? `remove "use client" from ${importer}, so it runs on the server${moveHooks}`
          : `render it in a server component and pass it to ${importer} as children or a prop`;
  // A package's file isn't the app's to change
  const typesOnly = isAppFile(chain[1]!) ? `; or, if ${importers[0]} imports only its types, write \`import type\`` : "";
  return (
    `${file} starts with "use server component", but the browser loads it: ${importer} ${imports} it${through}. ` +
    `To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ` +
    `or, ${toServer}${typesOnly}`
  );
}

async function isClientComponentFile(id: string, context: Context): Promise<boolean> {
  return (await getModule(context, getFile(id))).directives.includes("use client");
}
