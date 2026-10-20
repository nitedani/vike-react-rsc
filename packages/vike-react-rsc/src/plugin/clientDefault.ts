import { transformModuleExportEffect } from "@vitejs/plugin-rsc/transforms";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { createIdResolver, type Environment, type ESTree, type Plugin } from "vite";
import { getDirectives, getFile, getImportSources, isAppFile, parse, type Directive } from "./parse";

// A client component's import, which plugin-rsc's client reference imports in each env
const CLIENT_IMPORT = "virtual:vike-react-rsc/client-import:";

/** A file runs where the file that imports it runs, and a Page, Layout, Wrapper or Loading's `layout` where `components` says, unless
 * `"use client"` at its top puts it in the browser or `"use server component"` on the server. Under `'client'`, one without a
 * directive that imports a server component, through files without one, is a server component too */
export function clientDefault(): Plugin {
  // Whether the env last loaded the file as a server component, by env and file
  const isMarked = new Map<string, boolean>();
  // The files the env read to decide it, by env and file
  const readFiles = new Map<string, Set<string>>();
  // Each app file's directives and imports, by env and file
  const appModules = new Map<string, Promise<AppModule>>();
  let resolveImport: ReturnType<typeof createIdResolver>;
  // Each app file's directives and imports, as the env resolves them, without registering the packages for Vite to pre-bundle
  const getAppModule = (environment: Environment) => (file: string) => {
    const key = `${environment.name}:${file}`;
    let appModule = appModules.get(key);
    if (!appModule) appModules.set(key, (appModule = readAppModule(file, (source) => resolveImport(environment, source, file))));
    return appModule;
  };
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    configResolved: (config) => {
      resolveImport = createIdResolver(config);
    },
    configureServer: (server) => setBrowserEnvironment(server.environments.client!),
    // Before plugin-rsc's, which builds the envs
    buildApp: { order: "pre", handler: async (builder) => setBrowserEnvironment(builder.environments.client!) },
    resolveId: {
      // Before plugin-rsc's, which resolves the import with the react-server condition
      order: "pre",
      async handler(source, importer) {
        if (source.startsWith(`\0${CLIENT_IMPORT}`)) return source;
        if (this.environment.name !== "rsc" || !importer?.startsWith("\0virtual:vike:page-entry:") || !isClientDefault()) return;
        // A client component that the rsc env resolves to another file than the browser: its client reference is the import
        if ((await resolveComponentConfigs(this)).clientImports.has(source)) return `\0${CLIENT_IMPORT}${source}`;
      },
    },
    // Each env loads the file its own conditions give: the browser its file, the HTML render Node's
    async load(id) {
      if (!id.startsWith(`\0${CLIENT_IMPORT}`)) return;
      const importPath = id.slice(CLIENT_IMPORT.length + 1);
      const { importer, exportNames } = (await resolveComponentConfigs(this)).packageImports.get(importPath)!;
      const file = this.environment.name === "client" ? await resolveForBrowser(importPath, importer) : (await this.resolve(importPath, importer))?.id;
      return `"use client";\nexport { ${exportNames.join(", ")} } from ${JSON.stringify(file ?? importPath)};\n`;
    },
    async transform(code, id) {
      const components = (await getComponentConfigs(this))(id);
      if (!components) return;
      const isRsc = this.environment.name === "rsc";
      // Under 'server', plugin-rsc's own rule: a file without "use client" is a server component. Of these, only a
      // Loading also loads outside the rsc env, so a server one gets the stub there, as under 'client'
      if (!isClientDefault() && isRsc) return;
      // MDX has no directives, and its plugin has compiled it to JavaScript
      if (/\.mdx?$/.test(getFile(id))) return isRsc ? { code: `"use client";${code}`, map: null } : undefined;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      const key = `${this.environment.name}:${getFile(id)}`;
      const { isServerComponent, read } = await decideIsServerComponent(getFile(id), directives, components, getAppModule(this.environment));
      isMarked.set(key, isServerComponent);
      readFiles.set(key, read);
      // On the first line, so the source map stays valid
      if (isRsc && directives.length === 0 && !isServerComponent) return { code: `"use client";${code}`, map: null };
      if (!isServerComponent) return;
      const file = path.relative(this.environment.config.root, getFile(id));
      return isRsc ? tagServerComponent(code, program, components, file) : getServerComponentStub(components, file);
    },
    async hotUpdate({ type, file }) {
      const { environment } = this;
      // A new or deleted file can change what its importers import
      for (const key of appModules.keys()) {
        if (key === `${environment.name}:${file}` || (type !== "update" && key.startsWith(`${environment.name}:`))) appModules.delete(key);
      }
      if (type === "delete") {
        isMarked.delete(`${environment.name}:${file}`);
        readFiles.delete(`${environment.name}:${file}`);
        return;
      }
      const components = await getComponentConfigs({ environment, resolve: (source, importer) => environment.pluginContainer.resolveId(source, importer) });
      // Each Page, Layout, Wrapper or Loading that read the file to decide where it runs, the file itself included
      const changed: string[] = [];
      for (const [key, files] of readFiles) {
        if (!key.startsWith(`${environment.name}:`) || !files.has(file)) continue;
        const component = key.slice(environment.name.length + 1);
        const directives = getDirectives(await parse(await readFile(component, "utf8"), component));
        if ((await decideIsServerComponent(component, directives, components(component) ?? [], getAppModule(environment))).isServerComponent !== isMarked.get(key)) changed.push(key);
      }
      if (changed.length > 0) {
        // The env loads the file as another kind of module, e.g. a stub instead of a client component: it starts over
        for (const key of changed) {
          isMarked.delete(key);
          readFiles.delete(key);
          for (const mod of environment.moduleGraph.getModulesByFile(key.slice(environment.name.length + 1)) ?? []) environment.moduleGraph.invalidateModule(mod);
        }
        environment.hot.send({ type: "full-reload", triggeredBy: file });
        return [];
      }
      // Outside the rsc env, the edit leaves a server component's stub as it was: the rsc env's update refetches the Flight
      if (isMarked.get(`${environment.name}:${file}`) && environment.name !== "rsc") return [];
    },
  };
}

// Where the env runs a Page, Layout, Wrapper or Loading, and the files it read to decide it
async function decideIsServerComponent(file: string, directives: Directive[], components: ComponentConfig[], getAppModule: GetAppModule): Promise<{ isServerComponent: boolean; read: Set<string> }> {
  if (isServerComponentFor(directives, components)) return { isServerComponent: true, read: new Set([file]) };
  if (directives.length > 0 || !isClientDefault() || !isAppFile(file)) return { isServerComponent: false, read: new Set([file]) };
  const { serverComponentImport, read } = await findServerComponentImport(file, getAppModule);
  return { isServerComponent: serverComponentImport !== undefined, read };
}

/** The first "use server component" file that `file` imports, through files without a directive, as the files from `file` to
 * it, and every file read to find it */
async function findServerComponentImport(file: string, getAppModule: GetAppModule): Promise<{ serverComponentImport?: string[]; read: Set<string> }> {
  const importers = new Map<string, string>();
  const read = new Set([file]);
  const queue = [file];
  for (const importer of queue) {
    for (const imported of (await getAppModule(importer)).imports) {
      if (read.has(imported)) continue;
      read.add(imported);
      importers.set(imported, importer);
      const { directives } = await getAppModule(imported);
      if (directives.includes("use server component")) {
        const chain = [imported];
        while (chain[0] !== file) chain.unshift(importers.get(chain[0]!)!);
        return { serverComponentImport: chain, read };
      }
      // A file with a directive runs where it says, whatever it imports
      if (directives.length === 0) queue.push(imported);
    }
  }
  return { read };
}

// A file that doesn't parse has neither: its own transform reports why
async function readAppModule(file: string, resolve: (source: string) => Promise<string | undefined>): Promise<AppModule> {
  const program = await readFile(file, "utf8").then((code) => parse(code, file)).catch(() => undefined);
  if (!program) return { directives: [], imports: [] };
  const imports = await Promise.all(getImportSources(program).map(resolve));
  return { directives: getDirectives(program), imports: imports.flatMap((id) => (id && isAppFile(id) ? [getFile(id)] : [])) };
}

// By its directive, or as the file the env loads for a package's server component
function isServerComponentFor(directives: Directive[], components: ComponentConfig[]): boolean {
  return directives.includes("use server component") || components.some((c) => c.isServerComponentImport);
}

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

function resolveComponentConfigs(context: ResolveContext): Promise<ComponentConfigs> {
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
          else if (await isServerComponentFile(browserFile)) imports.push({ file, config: { ...config, isServerComponentImport: true } });
          else if (context.environment.name === "rsc") clientImports.add(importPath);
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
let resolveForBrowser: (importPath: string, importer: string | undefined) => Promise<string | undefined> = () => {
  throw new Error("[vike-react-rsc] The client env isn't known yet");
};

function setBrowserEnvironment(environment: Environment) {
  const resolve = createIdResolver(environment.getTopLevelConfig());
  resolveForBrowser = (importPath, importer) => resolve(environment, importPath, importer);
}

async function isServerComponentFile(file: string): Promise<boolean> {
  const code = await readFile(file, "utf8");
  return code.includes("use server component") && getDirectives(await parse(code, file)).includes("use server component");
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
type AppModule = { directives: Directive[]; imports: string[] };
type GetAppModule = (file: string) => Promise<AppModule>;
type ResolveContext = { environment: { name: string }; resolve: (source: string, importer?: string) => Promise<{ id: string } | null> };
type ComponentConfig = {
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

// Outside the rsc env, a server Page, Layout, Wrapper or Loading: the page renders from its Flight, which has what it
// rendered. Each export Vike reads, a + file's default one, whatever the file exports itself
function getServerComponentStub(components: ComponentConfig[], file: string) {
  const exports = [...new Set(components.map(({ exportName = "default" }) => `stub as ${exportName}`))].join(", ");
  return { code: `const stub = Object.assign(() => null, ${getServerComponentFlags(file)});\nexport { ${exports} };`, map: null };
}

// In the rsc env, a server Page, Layout, Wrapper or Loading carries the stub's flags, so every env finds it the same way
function tagServerComponent(code: string, program: ESTree.Program, components: ComponentConfig[], file: string) {
  // The exports Vike reads: each import's, or a + file's default one or the one named after the config
  const exportNames = [...new Set(components.flatMap(({ configName, exportName }) => (exportName ? [exportName] : [configName, "default"])))];
  const configNames = [...new Set(components.map(({ configName }) => configName))].join(" or ");
  const { output, references } = transformModuleExportEffect(code, program, {
    generate: ({ binding }) => `Object.assign(${binding}, ${getServerComponentFlags(file)})`,
    filter: (name) => exportNames.includes(name),
    exportAll: "preserve",
  });
  // Without such an export, the component comes from an export *, whose names show only in the other module
  const exportAll =
    references.length === 0 &&
    program.body.filter((node) => node.type === "ExportAllDeclaration").find((node) => node.exportKind !== "type");
  if (exportAll) {
    const source = JSON.stringify(exportAll.source.value);
    const statement = code.slice(exportAll.start, exportAll.source.end);
    throw new Error(
      `[vike-react-rsc] ${file} starts with "use server component", but ${statement} doesn't name its ${configNames}: ` +
        `write ${exportNames.map((name) => `export { ${name} } from ${source}`).join(" or ")}`
    );
  }
  return { code: output.toString(), map: output.generateMap({ hires: "boundary" }) };
}

function getServerComponentFlags(file: string) {
  return `{ isServerComponent: true, file: ${JSON.stringify(file)} }`;
}
