import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";
import { getOwnFileFix } from "../clientApiHint";
import { findPackageServerComponentImport, getComponentConfigs } from "./clientDefault";
import { getDirectives, getFile, getFileName, isAppFile, isModuleFile, parse } from "./parse";

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
        if (await isServerComponentFile(code, id)) serverComponentsInBrowser.add(id);
        return;
      }
      // In dev, the browser loads a package as Vite pre-bundled it, from the package's file the import names
      const preBundled = Object.values(environment.depsOptimizer?.metadata.optimized ?? {}).find(({ file }) => file === getFile(id))?.src;
      const serverComponentImport = preBundled
        ? await findPackageServerComponentImport(preBundled, environment.getTopLevelConfig())
        : (await isServerComponentFile(code, id)) && [id];
      if (!serverComponentImport) return;
      const { moduleGraph } = environment;
      const chains = getImportChains(id, getComponentConfig, (id) => [...(moduleGraph.getModuleById(id)?.importers ?? [])].flatMap((importer) => importer.id ?? []));
      const fromServerComponent = serverComponentImport.toReversed();
      this.error(await getServerComponentInBrowserErrors(chains.map(([, ...importers]) => [...fromServerComponent, ...importers]), getComponentConfig, environment.config.root));
    },
    async buildEnd() {
      if (this.environment.name !== "client") return;
      const getComponentConfig = await getComponentConfigs(this);
      for (const id of serverComponentsInBrowser) {
        const chains = getImportChains(id, getComponentConfig, (id) => [...(this.getModuleInfo(id)?.importers ?? [])]);
        this.error(await getServerComponentInBrowserErrors(chains, getComponentConfig, this.environment.config.root));
      }
    },
  };
}

type GetComponentConfig = Awaited<ReturnType<typeof getComponentConfigs>>;

async function isServerComponentFile(code: string, id: string): Promise<boolean> {
  return code.includes("use server component") && getDirectives(await parse(code, id)).includes("use server component");
}

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

async function getServerComponentInBrowserErrors(chains: string[][], getComponentConfig: GetComponentConfig, root: string): Promise<string> {
  const errors = await Promise.all(chains.map((chain) => getServerComponentInBrowserError(chain, getComponentConfig, root)));
  return [...new Set(errors)].join("\n");
}

// A server component renders only on the server, and so does a file without a directive that imports one. A component in the
// browser shows one through rsc(); a file that says "use client" can't import one.
async function getServerComponentInBrowserError(chain: string[], getComponentConfig: GetComponentConfig, root: string): Promise<string> {
  const [file, ...importers] = chain.map((id) => getFileName(id, root));
  if (importers.length === 0) return `${file} starts with "use server component", but the browser loads it`;
  // The file that puts the chain in the browser, or else the file at its top
  const clientIndex = (await Promise.all(chain.slice(1).map(isClientComponentFile))).indexOf(true);
  const index = clientIndex === -1 ? importers.length - 1 : clientIndex;
  const importer = importers[index]!;
  const through = index > 0 ? ` through ${importers.slice(0, index).reverse().join(", ")}` : "";
  const imports = clientIndex === -1 ? "imports" : 'starts with "use client" and imports';
  const toServer =
    clientIndex !== -1
      ? `remove "use client" from ${importer}, so it runs on the server, and move its hooks and event handlers into their own "use client" component`
      : getComponentConfig(chain.at(-1)!)
        ? `if ${importer} needs nothing from the browser (no hooks, no event handlers), start it with "use server component"`
        : "import it only from server components";
  // A package's file isn't the app's to change
  const importFix = isAppFile(chain[1]!) ? `if ${importers[0]} imports only its types, write \`import type\`` : getOwnFileFix([file!, ...importers].toReversed());
  return (
    `${file} starts with "use server component", but the browser loads it: ${importer} ${imports} it${through}. ` +
    `To show it in the browser, return it from a function in a "use server" file and render that function through rsc() from vike-react-rsc/client; ` +
    `or, ${toServer}${importFix ? `; or, ${importFix}` : ""}`
  );
}

async function isClientComponentFile(id: string): Promise<boolean> {
  const file = getFile(id);
  const code = await readFile(file, "utf8").catch(() => "");
  return code.includes("use client") && getDirectives(await parse(code, file)).includes("use client");
}
