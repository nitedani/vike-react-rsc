import { transformModuleExportEffect } from "@vitejs/plugin-rsc/transforms";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { createIdResolver, type Environment, type ESTree, type Plugin } from "vite";
import { getDirectives, getFile, parse, type Directive } from "./parse";

/** A file runs where the file that imports it runs, and a Page, Layout, Wrapper or Loading's `layout` where `components` says, unless
 * `"use client"` at its top puts it in the browser or `"use server component"` on the server */
export function clientDefault(): Plugin {
  // Whether the file had the marker when the env last transformed it, by env and file
  const isMarked = new Map<string, boolean>();
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    configureServer: (server) => setBrowserEnvironment(server.environments.client!),
    // Before plugin-rsc's, which builds the envs
    buildApp: { order: "pre", handler: async (builder) => setBrowserEnvironment(builder.environments.client!) },
    resolveId: {
      // Before plugin-rsc's, which resolves the import with the react-server condition
      order: "pre",
      async handler(source, importer) {
        if (this.environment.name !== "rsc" || !importer?.startsWith("\0virtual:vike:page-entry:") || !isClientDefault()) return;
        // A client component from a package: the rsc env makes its client reference from the file the browser loads
        return (await resolveComponentConfigs(this)).clientFiles.get(source);
      },
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
      const isServerComponent = isServerComponentFor(directives, components);
      isMarked.set(`${this.environment.name}:${getFile(id)}`, isServerComponent);
      // On the first line, so the source map stays valid
      if (isRsc && directives.length === 0 && !isServerComponent) return { code: `"use client";${code}`, map: null };
      if (!isServerComponent) return;
      const file = path.relative(this.environment.config.root, getFile(id));
      return isRsc ? tagServerComponent(code, program, components, file) : getServerComponentStub(components, file);
    },
    async hotUpdate({ type, file, read }) {
      if (type === "delete") return;
      const key = `${this.environment.name}:${file}`;
      if (!isMarked.has(key)) return;
      const { environment } = this;
      const components = await getComponentConfigs({ environment, resolve: (source, importer) => environment.pluginContainer.resolveId(source, importer) });
      if (isServerComponentFor(getDirectives(await parse(await read(), file)), components(file) ?? []) !== isMarked.get(key)) {
        // The env loads the file as another kind of module, e.g. a stub instead of a client component: it starts over
        isMarked.delete(key);
        this.environment.hot.send({ type: "full-reload", triggeredBy: file });
        return [];
      }
      // Outside the rsc env, the edit leaves a server component's stub as it was: the rsc env's update refetches the Flight
      if (isMarked.get(key) && this.environment.name !== "rsc") return [];
    },
  };
}

// By its directive, or as the file the rsc env loads for a package's server component
function isServerComponentFor(directives: Directive[], components: ComponentConfig[]): boolean {
  return directives.includes("use server component") || components.some((c) => c.isReactServerFile);
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
  const imports: { file?: string; importPath?: string; importer?: string; config: ComponentConfig }[] = [];
  const clientFiles = new Map<string, string>();
  for (const { configValueSources } of pageConfigs) {
    for (const configName of ["Page", "Layout", "Wrapper", "Loading"]) {
      for (const source of configValueSources[configName] ?? []) {
        for (const { appFile, importPath, importer, exportName } of getComponentImports(source)) {
          const config = { configName, exportName };
          const file = appFile ?? (importPath && (await resolveForBrowser(importPath, importer)));
          imports.push({ file, importPath, importer, config });
          // An import that the rsc env resolves to another file, by the package's conditions: the directive of the browser's
          // file says where the component runs, and the conditions which file the rsc env loads for a server one
          if (!importPath || !file || context.environment.name !== "rsc" || (await context.resolve(importPath, importer))?.id === file) continue;
          if (await isServerComponentFile(file)) imports.push({ file: undefined, importPath, importer, config: { ...config, isReactServerFile: true } });
          else clientFiles.set(importPath, file);
        }
      }
    }
  }
  const files = await Promise.all(imports.map(async ({ file, importPath, importer }) => file ?? (importPath && (await context.resolve(importPath, importer))?.id)));
  // A file can serve several, e.g. two named exports as the Layouts of two pages
  const byFile = new Map<string, ComponentConfig[]>();
  imports.forEach(({ config }, i) => {
    if (!files[i]) return;
    const configs = byFile.get(getFile(files[i])) ?? [];
    if (!configs.some((c) => c.configName === config.configName && c.exportName === config.exportName && c.isReactServerFile === config.isReactServerFile)) {
      configs.push(config);
    }
    byFile.set(getFile(files[i]), configs);
  });
  return { byFile, clientFiles };
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
type ResolveContext = { environment: { name: string }; resolve: (source: string, importer?: string) => Promise<{ id: string } | null> };
type ComponentConfig = {
  configName: string;
  /** The export of the import that Vike reads; none for a + file */
  exportName: string | undefined;
  /** The file the rsc env loads for a server component whose package's react-server condition points to another file */
  isReactServerFile?: true;
};
type ComponentConfigs = {
  byFile: Map<string, ComponentConfig[]>;
  /** For an import of a client component from a package, the file the browser loads */
  clientFiles: Map<string, string>;
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
