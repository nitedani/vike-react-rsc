import { readFile } from "node:fs/promises";
import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { createIdResolver, type Environment } from "vite";
import { getFile, startsWithDirective } from "./parse";

export function isClientDefault(): boolean {
  // One module is one component in the rsc env, so all pages have the same default
  const values = new Set(Object.values(getVikeConfig().pages).map((page) => page.config.components));
  if (values.size > 1) {
    throw new Error(`[vike-react-rsc] Set components once, in the root +config.js: pages set it to ${[...values].join(" and ")}`);
  }
  return values.has("client");
}

/** Finds each Page, Layout, Wrapper or Loading that Vike loads from a file, by its + file or by an import of a +config file
 * or an extension's config, as the browser resolves the import, or the env when the browser can't */
export async function getComponentConfigs(context: ResolveContext): Promise<(id: string) => ComponentConfig[] | undefined> {
  const { byFile } = await resolveComponentConfigs(context);
  return (id) => byFile.get(getFile(id));
}

export function resolveComponentConfigs(context: ResolveContext): Promise<ComponentConfigs> {
  const { _pageConfigs } = getVikeConfig().dangerouslyUseInternals;
  let byEnv = componentConfigs.get(_pageConfigs);
  if (!byEnv) componentConfigs.set(_pageConfigs, (byEnv = new Map()));
  let resolved = byEnv.get(context.environment.name);
  if (!resolved) byEnv.set(context.environment.name, (resolved = readComponentConfigs(_pageConfigs, context)));
  return resolved;
}

async function readComponentConfigs(pageConfigs: PageConfigs, context: ResolveContext): Promise<ComponentConfigs> {
  const imports: { file: string | undefined; config: ComponentConfig }[] = [];
  const clientImports = new Set<string>();
  const packageImports = new Map<string, { importer: string | undefined; exportNames: string[] }>();
  for (const { configValueSources } of pageConfigs) {
    for (const configName of ["Page", "Layout", "Wrapper", "Loading"]) {
      for (const source of configValueSources[configName] ?? []) {
        for (const { appFile, importPath, importer, exportName } of getComponentImports(source)) {
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
            imports.push({ file, config: { ...config, isServerComponentImport: true } });
          } else if (context.environment.name === "rsc") clientImports.add(importPath);
        }
      }
    }
  }
  // A file can serve several, e.g. two named exports as the Layouts of two pages
  const byFile = new Map<string, ComponentConfig[]>();
  for (const { file, config } of imports) {
    if (!file) continue;
    const configs = byFile.get(getFile(file)) ?? [];
    if (!configs.some((c) => c.configName === config.configName && c.exportName === config.exportName && c.isServerComponentImport === config.isServerComponentImport)) {
      configs.push(config);
    }
    byFile.set(getFile(file), configs);
  }
  return { byFile, clientImports, packageImports };
}

/** Each import Vike loads a component from: the value's own, or each import string in the value, e.g. Loading: { layout }.
 * Either the app's own file, or an import of a package or through a path alias */
function getComponentImports(source: ConfigValueSource): ComponentImport[] {
  const { definedAt } = source;
  if (!("filePathAbsoluteFilesystem" in definedAt)) return [];
  if (source.valueLoadedViaImport) {
    const { filePathAbsoluteFilesystem: file, importPathAbsolute: importPath, fileExportName: exportName } = definedAt;
    const importer = source.plusFile?.filePath.filePathAbsoluteFilesystem ?? undefined;
    return [importPath ? { importPath, importer, exportName } : { appFile: file ?? undefined, exportName }];
  }
  if (!source.valueIsLoaded) return [];
  const importer = definedAt.filePathAbsoluteFilesystem ?? undefined;
  return getPointerImports(source.value).map(({ importPath, exportName }) =>
    // Vike makes a +config file's relative import absolute
    path.isAbsolute(importPath) ? { appFile: importPath, exportName } : { importPath, importer, exportName }
  );
}

// The file the browser loads for an import, as the client env resolves it, with the browser's conditions
export let resolveForBrowser: (importPath: string, importer: string | undefined) => Promise<string | undefined> = () => {
  throw new Error("[vike-react-rsc] The client env isn't known yet");
};

export function setBrowserEnvironment(environment: Environment): void {
  const resolve = createIdResolver(environment.getTopLevelConfig());
  resolveForBrowser = (importPath, importer) => resolve(environment, importPath, importer);
}

// The import strings in a value: an extension's, or the one Vike makes of a +config file's import, e.g. "import:/app/Spinner.tsx:Spinner"
function getPointerImports(value: unknown): { importPath: string; exportName: string }[] {
  if (typeof value === "string") {
    const parts = value.replace(/^\u200b/, "").split(":");
    if (parts[0] !== "import" || parts.length < 2) return [];
    return parts.length === 2 ? [{ importPath: parts[1]!, exportName: "default" }] : [{ importPath: parts.slice(1, -1).join(":"), exportName: parts.at(-1)! }];
  }
  return value && typeof value === "object" ? Object.values(value).flatMap(getPointerImports) : [];
}

type PageConfigs = ReturnType<typeof getVikeConfig>["dangerouslyUseInternals"]["_pageConfigs"];
type ConfigValueSource = PageConfigs[number]["configValueSources"][string][number];
type ComponentImport = { appFile?: string; importPath?: string; importer?: string; exportName?: string };
export type ResolveContext = { environment: { name: string }; resolve: (source: string, importer?: string) => Promise<{ id: string } | null> };
export type ComponentConfig = {
  configName: string;
  /** The export of the import that Vike reads; none for a + file */
  exportName: string | undefined;
  /** The file the env loads for a server component, where the browser's file is another */
  isServerComponentImport?: true;
};
type ComponentConfigs = {
  byFile: Map<string, ComponentConfig[]>;
  /** The imports of client components that the rsc env resolves to another file than the browser */
  clientImports: Set<string>;
  /** Each import of a package or through a path alias: the first file that imports it, and the exports Vike reads */
  packageImports: Map<string, { importer: string | undefined; exportNames: string[] }>;
};
// By Vike's page configs, which it replaces when a config changes, then by env
const componentConfigs = new WeakMap<object, Map<string, Promise<ComponentConfigs>>>();
