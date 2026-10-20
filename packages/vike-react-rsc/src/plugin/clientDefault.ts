import { transformModuleExportEffect } from "@vitejs/plugin-rsc/transforms";
import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import type { ESTree, Plugin } from "vite";
import { getDirectives, getFile, parse } from "./parse";

/** A file runs where the file that imports it runs, and a Page, Layout, Wrapper or Loading's `layout` where `components` says, unless
 * `"use client"` at its top puts it in the browser or `"use server component"` on the server */
export function clientDefault(): Plugin {
  // Whether the file had the marker when the env last transformed it, by env and file
  const isMarked = new Map<string, boolean>();
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      const component = (await getComponentConfigs(this))(id);
      if (!component) return;
      const isRsc = this.environment.name === "rsc";
      // Under 'server', plugin-rsc's own rule: a file without "use client" is a server component. Of these, only a
      // Loading also loads outside the rsc env, so a server one gets the stub there, as under 'client'
      if (!isClientDefault() && isRsc) return;
      // MDX has no directives, and its plugin has compiled it to JavaScript
      if (/\.mdx?$/.test(getFile(id))) return isRsc ? { code: `"use client";${code}`, map: null } : undefined;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      const isServerComponent = directives.includes("use server component");
      isMarked.set(`${this.environment.name}:${getFile(id)}`, isServerComponent);
      // On the first line, so the source map stays valid
      if (isRsc && directives.length === 0) return { code: `"use client";${code}`, map: null };
      if (!isServerComponent) return;
      const file = path.relative(this.environment.config.root, getFile(id));
      return isRsc ? tagServerComponent(code, program, component, file) : getServerComponentStub(component, file);
    },
    async hotUpdate({ type, file, read }) {
      if (type === "delete") return;
      const key = `${this.environment.name}:${file}`;
      if (!isMarked.has(key)) return;
      if (getDirectives(await parse(await read(), file)).includes("use server component") !== isMarked.get(key)) {
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

export function isClientDefault(): boolean {
  // One module is one component in the rsc env, so all pages have the same default
  const values = new Set(Object.values(getVikeConfig().pages).map((page) => page.config.components));
  if (values.size > 1) {
    throw new Error(`[vike-react-rsc] Set components once, in the root +config.js: pages set it to ${[...values].join(" and ")}`);
  }
  return values.has("client");
}

/** Finds the Page, Layout, Wrapper or Loading that Vike loads from a file, by its + file or by an import of a +config file
 * or an extension's config, as the env resolves the imports Vike leaves to Vite */
export async function getComponentConfigs(context: ResolveContext): Promise<(id: string) => ComponentConfig | undefined> {
  const { _pageConfigs } = getVikeConfig().dangerouslyUseInternals;
  let byEnv = componentConfigs.get(_pageConfigs);
  if (!byEnv) componentConfigs.set(_pageConfigs, (byEnv = new Map()));
  let byFile = byEnv.get(context.environment.name);
  if (!byFile) byEnv.set(context.environment.name, (byFile = resolveComponentConfigs(_pageConfigs, context)));
  const resolved = await byFile;
  return (id) => resolved.get(getFile(id));
}

async function resolveComponentConfigs(pageConfigs: PageConfigs, context: ResolveContext) {
  const imports: { file: string | undefined; importPath?: string; importer?: string; config: ComponentConfig }[] = [];
  for (const { configValueSources } of pageConfigs) {
    for (const configName of ["Page", "Layout", "Wrapper", "Loading"]) {
      for (const source of configValueSources[configName] ?? []) {
        const { definedAt } = source;
        if (!("filePathAbsoluteFilesystem" in definedAt)) continue;
        if (source.valueLoadedViaImport) {
          // null for a path alias that Node doesn't know, e.g. one only Vite defines
          const { filePathAbsoluteFilesystem: file, importPathAbsolute: importPath } = definedAt;
          imports.push({ file: file ?? undefined, importPath: importPath ?? undefined, config: { configName, exportName: definedAt.fileExportName } });
        } else if (source.valueIsLoaded) {
          // An import in the value, e.g. Loading: { layout }, which Vike imports as it is written
          for (const { importPath, exportName } of getPointerImports(source.value)) {
            imports.push({ file: undefined, importPath, importer: definedAt.filePathAbsoluteFilesystem ?? undefined, config: { configName, exportName } });
          }
        }
      }
    }
  }
  const files = await Promise.all(imports.map(async ({ file, importPath, importer }) => file ?? (importPath && (await context.resolve(importPath, importer))?.id)));
  return new Map(imports.flatMap(({ config }, i) => (files[i] ? [[getFile(files[i]), config] as const] : [])));
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
type ResolveContext = { environment: { name: string }; resolve: (source: string, importer?: string) => Promise<{ id: string } | null> };
type ComponentConfig = {
  configName: string;
  /** The export of the import that Vike reads; none for a + file */
  exportName: string | undefined;
};
// By Vike's page configs, which it replaces when a config changes, then by env
const componentConfigs = new WeakMap<object, Map<string, Promise<Map<string, ComponentConfig>>>>();

// Outside the rsc env, a server Page, Layout, Wrapper or Loading: the page renders from its Flight, which has what it
// rendered. The export Vike reads, a + file's default one, whatever the file exports itself
function getServerComponentStub({ exportName = "default" }: ComponentConfig, file: string) {
  return { code: `const stub = Object.assign(() => null, ${getServerComponentFlags(file)});\nexport { stub as ${exportName} };`, map: null };
}

// In the rsc env, a server Page, Layout, Wrapper or Loading carries the stub's flags, so every env finds it the same way
function tagServerComponent(code: string, program: ESTree.Program, { configName, exportName }: ComponentConfig, file: string) {
  // The exports Vike reads: the import's, or a + file's default one or the one named after the config
  const exportNames = exportName ? [exportName] : [configName, "default"];
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
      `[vike-react-rsc] ${file} starts with "use server component", but ${statement} doesn't name its ${configName}: ` +
        `write ${exportNames.map((name) => `export { ${name} } from ${source}`).join(" or ")}`
    );
  }
  return { code: output.toString(), map: output.generateMap({ hires: "boundary" }) };
}

function getServerComponentFlags(file: string) {
  return `{ isServerComponent: true, file: ${JSON.stringify(file)} }`;
}
