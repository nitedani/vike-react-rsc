import { readFile } from "node:fs/promises";
import { getVikeConfig } from "vike/plugin";
import { resolveForBrowser } from "./browserResolver";
import { getFile, startsWithDirective } from "./parse";
import { getPartImports, type PartImport } from "./vikeParts";

export function isClientDefault(): boolean {
  // One module is one component in the rsc env, so all pages have the same default
  const values = new Set(Object.values(getVikeConfig().pages).map((page) => page.config.components));
  if (values.size > 1) {
    throw new Error(`[vike-react-rsc] Set components once, in the root +config.js: pages set it to ${[...values].join(" and ")}`);
  }
  return values.has("client");
}

/** Each Page, Layout, Wrapper or Loading that the env loads from the file, whatever the id's query */
export async function getComponentConfigs(context: ResolveContext): Promise<(id: string) => Part[] | undefined> {
  const { byFile } = await resolveComponentConfigs(context);
  return (id) => byFile.get(getFile(id));
}

export function resolveComponentConfigs(context: ResolveContext): Promise<ComponentConfigs> {
  const partImports = getPartImports();
  let byEnv = componentConfigs.get(partImports);
  if (!byEnv) componentConfigs.set(partImports, (byEnv = new Map()));
  let resolved = byEnv.get(context.environment.name);
  if (!resolved) byEnv.set(context.environment.name, (resolved = readComponentConfigs(partImports, context)));
  return resolved;
}

async function readComponentConfigs(partImports: PartImport[], context: ResolveContext): Promise<ComponentConfigs> {
  const imports: { file: string | undefined; config: Part }[] = [];
  const clientImports = new Set<string>();
  const packageImports = new Map<string, { importer: string | undefined; exportNames: string[] }>();
  for (const { configName, appFile, importPath, importer, exportName } of partImports) {
    const config = { configName, exportName };
    if (!importPath) {
      imports.push({ file: appFile, config });
      continue;
    }
    const packageImport = packageImports.get(importPath) ?? { importer, exportNames: [] };
    packageImports.set(importPath, { importer: packageImport.importer, exportNames: [...new Set([...packageImport.exportNames, exportName ?? "default"])] });
    const file = (await context.resolve(importPath, importer))?.id;
    const browserFile = await resolveForBrowser(importPath, importer);
    // An import that the env resolves to another file than the browser, by the package's conditions or to the dep Vite
    // pre-bundled in dev: the directive of the browser's file says where the component runs
    if (!browserFile || !file || file === browserFile) imports.push({ file, config });
    else if (await startsWithDirective(await readFile(browserFile, "utf8"), browserFile, "use server component")) {
      imports.push({ file, config: { ...config, isPackageServerComponent: true } });
    } else if (context.environment.name === "rsc") clientImports.add(importPath);
  }
  // A file can serve several, e.g. two named exports as the Layouts of two pages
  const byFile = new Map<string, Part[]>();
  for (const { file, config } of imports) {
    if (!file) continue;
    const parts = byFile.get(getFile(file)) ?? [];
    parts.push(config);
    byFile.set(getFile(file), parts);
  }
  return { byFile, clientImports: new Map([...clientImports].map((importPath) => [importPath, packageImports.get(importPath)!])) };
}

export type ResolveContext = { environment: { name: string }; resolve: (source: string, importer?: string) => Promise<{ id: string } | null> };
export type Part = {
  configName: string;
  /** The export of the import that Vike reads; none for a + file */
  exportName: string | undefined;
  /** The file the env loads for a server component, where the browser's file is another */
  isPackageServerComponent?: true;
};
type ComponentConfigs = {
  byFile: Map<string, Part[]>;
  /** The imports of client components that the rsc env resolves to another file than the browser: the first file that
   * imports each, and the exports Vike reads */
  clientImports: Map<string, { importer: string | undefined; exportNames: string[] }>;
};
// By Vike's part imports, then by env
const componentConfigs = new WeakMap<PartImport[], Map<string, Promise<ComponentConfigs>>>();
