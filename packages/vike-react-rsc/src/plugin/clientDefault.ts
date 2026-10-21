import { transformModuleExportEffect } from "@vitejs/plugin-rsc/transforms";
import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { createIdResolver, type Environment, type ESTree, type Plugin, type ResolvedConfig } from "vite";
import packageJson from "../../package.json";
import { getDirectives, getFile, getFileName, getImportSources, isAppFile, isModuleFile, parse, parseCompiled, type Directive } from "./parse";

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
  // Each module's directives and imports, by env and file
  const modules = new Map<string, Promise<WalkedModule>>();
  let config: ResolvedConfig;
  // A module's directives and imports, of the app or of a package. Its imports as the browser resolves them, so each env
  // walks the files the browser would load, without registering the packages for Vite to pre-bundle; or else as the env's
  // plugins do, e.g. vite-tsconfig-paths. `read` gives its code if it isn't read yet
  const getModule = (context: ResolveContext) => (file: string, read: () => string | Promise<string> = () => readFile(file, "utf8")) => {
    const key = `${context.environment.name}:${file}`;
    let walked = modules.get(key);
    if (!walked) {
      const resolveFrom = async (source: string) => (await resolveForBrowser(source, file)) ?? (await context.resolve(source, file))?.id;
      modules.set(key, (walked = readModule(file, read, config, resolveFrom)));
    }
    return walked;
  };
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    configResolved: (resolvedConfig) => {
      config = resolvedConfig;
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
      const { isServerComponent, serverComponentImport, read } = await decideIsServerComponent(getFile(id), directives, components, getModule(this));
      isMarked.set(key, isServerComponent);
      readFiles.set(key, read);
      // On the first line, so the source map stays valid
      if (isRsc && directives.length === 0 && !isServerComponent) return { code: `"use client";${code}`, map: null };
      if (!isServerComponent) return;
      const { root } = this.environment.config;
      const file = path.relative(root, getFile(id));
      const flags = getServerComponentFlags(file, serverComponentImport?.map((imported) => getFileName(imported, root)));
      return isRsc ? tagServerComponent(code, program, components, file, flags) : getServerComponentStub(components, flags);
    },
    async hotUpdate({ type, file, read }) {
      const { environment } = this;
      // A new or deleted file can change what its importers import
      for (const key of modules.keys()) {
        if (key === `${environment.name}:${file}` || (type !== "update" && key.startsWith(`${environment.name}:`))) modules.delete(key);
      }
      if (type === "delete") {
        isMarked.delete(`${environment.name}:${file}`);
        readFiles.delete(`${environment.name}:${file}`);
        return;
      }
      const context = { environment, resolve: (source: string, importer?: string) => environment.pluginContainer.resolveId(source, importer) };
      const components = await getComponentConfigs(context);
      // Each Page, Layout, Wrapper or Loading that read the file to decide where it runs, the file itself included
      const changed: string[] = [];
      for (const [key, files] of readFiles) {
        if (!key.startsWith(`${environment.name}:`) || !files.has(file)) continue;
        // The file as the editor saved it, read once: read() waits for the content of a file that the editor empties first
        getModule(context)(file, read);
        const component = key.slice(environment.name.length + 1);
        const { directives } = await getModule(context)(component);
        if ((await decideIsServerComponent(component, directives, components(component) ?? [], getModule(context))).isServerComponent !== isMarked.get(key)) changed.push(key);
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

// Where the env runs a Page, Layout, Wrapper or Loading, the server component import that decides it if any, and the files read
async function decideIsServerComponent(
  file: string,
  directives: Directive[],
  components: ComponentConfig[],
  getModule: GetModule
): Promise<{ isServerComponent: boolean; serverComponentImport?: string[]; read: Set<string> }> {
  if (isServerComponentFor(directives, components)) return { isServerComponent: true, read: new Set([file]) };
  if (directives.length > 0 || !isClientDefault() || !isAppFile(file)) return { isServerComponent: false, read: new Set([file]) };
  const { serverComponentImport, read } = await findServerComponentImport(file, getModule);
  return { isServerComponent: serverComponentImport !== undefined, serverComponentImport, read };
}

/** The first "use server component" file that `file` imports, through files without a directive, as the files from `file` to
 * it, and every file read to find it */
async function findServerComponentImport(file: string, getModule: GetModule): Promise<{ serverComponentImport?: string[]; read: Set<string> }> {
  const importers = new Map<string, string>();
  const read = new Set([file]);
  const queue = [file];
  for (const importer of queue) {
    for (const imported of (await getModule(importer)).imports) {
      if (read.has(imported)) continue;
      read.add(imported);
      importers.set(imported, importer);
      const { directives } = await getModule(imported);
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

/** The files from a package's file to the "use server component" file it is or imports through files without a
 * directive, if any, as the browser loads them */
export async function findPackageServerComponentImport(file: string, config: ResolvedConfig): Promise<string[] | undefined> {
  const getModule = (file: string) => readModule(file, () => readFile(file, "utf8"), config, async (source) => resolveForBrowser(source, file));
  const { directives } = await getModule(file);
  if (directives.includes("use server component")) return [file];
  if (directives.length === 0) return (await findServerComponentImport(file, getModule)).serverComponentImport;
}

/** Whether a file imports a "use server component" file through files without a directive, whatever its own directive: under
 * `'client'`, a Page, Layout, Wrapper or Loading without one that does is a server component */
export async function importsServerComponent(file: string, context: ResolveContext & { environment: Environment }): Promise<boolean> {
  const config = context.environment.getTopLevelConfig();
  const getModule = (file: string) =>
    readModule(file, () => readFile(file, "utf8"), config, async (source) => (await resolveForBrowser(source, file)) ?? (await context.resolve(source, file))?.id);
  return (await findServerComponentImport(file, getModule)).serverComponentImport !== undefined;
}

// A file that doesn't parse has neither: its own transform reports why
async function readModule(
  file: string,
  read: () => string | Promise<string>,
  config: ResolvedConfig,
  resolve: (source: string) => Promise<string | undefined>
): Promise<WalkedModule> {
  if (!(await canImportServerComponent(file))) return { directives: [], imports: [] };
  const program = await Promise.resolve()
    .then(read)
    .then((code) => parseCompiled(code, file, config))
    .catch(() => undefined);
  if (!program) return { directives: [], imports: [] };
  const imports = await Promise.all(getImportSources(program).map(resolve));
  // An import with a query, e.g. ?raw, ?url or ?worker, gives something else than the module
  return { directives: getDirectives(program), imports: imports.flatMap((id) => (id && isModuleFile(id) && !id.includes("?") ? [id] : [])) };
}

/** Whether a file can import a server component: a package's file only if a file of the package, or of a package it
 * depends on, names "use server component" */
async function canImportServerComponent(file: string): Promise<boolean> {
  const [root, name] = /^.*\/node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file) ?? [];
  if (!root) return true;
  if (frameworkPackages.has(name!)) return false;
  const read = new Set([root]);
  // A level of dependencies at a time, each package read at once
  for (let level = [root]; level.length > 0; ) {
    const packages = await Promise.all(level.map(getPackage));
    if (packages.some(({ namesServerComponent }) => namesServerComponent)) return true;
    level = [...new Set(packages.flatMap(({ dependencies }) => dependencies))].filter((dir) => !read.has(dir));
    for (const dir of level) read.add(dir);
  }
  return false;
}

function getPackage(dir: string): Promise<Package> {
  let found = packages.get(dir);
  if (!found) packages.set(dir, (found = readPackage(dir)));
  return found;
}

async function readPackage(dir: string): Promise<Package> {
  // Its modules, without type declarations and the packages installed inside it
  const files = (await readdir(dir, { recursive: true })).filter((file) => isModuleFile(file) && !/\.d\.[cm]?ts$/.test(file) && !file.includes("node_modules"));
  const namesServerComponent = (await Promise.all(files.map(async (file) => (await readFile(path.join(dir, file), "utf8")).includes("use server component")))).includes(true);
  const { dependencies, optionalDependencies, peerDependencies } = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  const names = Object.keys({ ...dependencies, ...optionalDependencies, ...peerDependencies }).filter((name) => !frameworkPackages.has(name));
  const found = await Promise.all(names.map((name) => findPackage(name, dir)));
  return { namesServerComponent, dependencies: found.flatMap((dependency) => dependency ?? []) };
}

// As Node finds it: in the node_modules of the package's directory or of the nearest parent that has it
async function findPackage(name: string, from: string): Promise<string | undefined> {
  for (let dir = from; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    if (path.basename(dir) === "node_modules") continue;
    const found = await realpath(path.join(dir, "node_modules", name)).catch(() => undefined);
    if (found) return found;
  }
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
type WalkedModule = { directives: Directive[]; imports: string[] };
type GetModule = (file: string) => Promise<WalkedModule>;
export type ResolveContext = { environment: { name: string }; resolve: (source: string, importer?: string) => Promise<{ id: string } | null> };
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
/** Whether a file of the package names "use server component", and the directory of each package it depends on */
type Package = { namesServerComponent: boolean; dependencies: string[] };
// By the package's directory: its files stay as installed
const packages = new Map<string, Promise<Package>>();
// vike-react-rsc and the packages it runs on, which import none of the app's server components
const frameworkPackages = new Set([packageJson.name, ...Object.keys({ ...packageJson.dependencies, ...packageJson.peerDependencies })]);
// By Vike's page configs, which it replaces when a config changes, then by env
const componentConfigs = new WeakMap<object, Map<string, Promise<ComponentConfigs>>>();

// Outside the rsc env, a server Page, Layout, Wrapper or Loading: the page renders from its Flight, which has what it
// rendered. Each export Vike reads, a + file's default one, whatever the file exports itself
function getServerComponentStub(components: ComponentConfig[], flags: string) {
  const exports = [...new Set(components.map(({ exportName = "default" }) => `stub as ${exportName}`))].join(", ");
  return { code: `const stub = Object.assign(() => null, ${flags});\nexport { ${exports} };`, map: null };
}

// In the rsc env, a server Page, Layout, Wrapper or Loading carries the stub's flags, so every env finds it the same way
function tagServerComponent(code: string, program: ESTree.Program, components: ComponentConfig[], file: string, flags: string) {
  // The exports Vike reads: each import's, or a + file's default one or the one named after the config
  const exportNames = [...new Set(components.flatMap(({ configName, exportName }) => (exportName ? [exportName] : [configName, "default"])))];
  const configNames = [...new Set(components.map(({ configName }) => configName))].join(" or ");
  const { output, references } = transformModuleExportEffect(code, program, {
    generate: ({ binding }) => `Object.assign(${binding}, ${flags})`,
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

// With, for a file that is one because it imports a server component, the files from it to that server component
function getServerComponentFlags(file: string, serverComponentImport: string[] | undefined) {
  return JSON.stringify({ isServerComponent: true, file, serverComponentImport });
}
