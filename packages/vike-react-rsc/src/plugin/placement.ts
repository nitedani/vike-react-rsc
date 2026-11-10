import { transformModuleExportEffect } from "@vitejs/plugin-rsc/transforms";
import path from "node:path";
import type { ESTree, Plugin } from "vite";
import type { ServerComponentFlags } from "../rendersFlight";
import { resolveForBrowser } from "./browserResolver";
import { getComponentConfigs, isClientDefault, resolveComponentConfigs, type Part } from "./componentConfigs";
import { getDirectives, getFile, getFileName, isAppFile, parse, type Directive } from "./parse";
import { findServerComponentImport, getModule, invalidateModules, resolveImport, type Context } from "./serverComponentImports";
import {
  getPageConfigs,
  getPagePartImports,
  hasAppServerHook,
  isPageEntry,
  isVikeVirtualModule,
  setNeedsPageContextRequest,
  type PageConfig,
  type PageConfigs,
} from "./vikeParts";

// A client component's import, with the exports Vike reads and the file that imports it, which plugin-rsc's client reference
// imports in each env
const CLIENT_IMPORT = "virtual:vike-react-rsc/client-import:";

/** A file runs where the file that imports it runs, and a Page, Layout, Wrapper or Loading's `layout` where `components` says, unless
 * `"use client"` at its top puts it in the browser or `"use server component"` on the server. Under `'client'`, one without a
 * directive that imports a server component, through files without one, is a server component too */
export function placement(): Plugin[] {
  // Whether the env last loaded the file as a server component, and the files it read to decide it, by env and file
  const decisions = new Map<string, Map<string, Decision>>();
  const getDecisions = (environmentName: string) => {
    let decided = decisions.get(environmentName);
    if (!decided) decisions.set(environmentName, (decided = new Map()));
    return decided;
  };
  // By Vike's page configs, the decision of whether each page needs a pageContext request and the files read to take it
  let pageContextRequests = new WeakMap<PageConfigs, { decided: Promise<void>; read: Set<string> }>();
  const decideRequests = (pageConfigs: PageConfigs, context: Context) => {
    const read = new Set<string>();
    const decided = decidePageContextRequests(pageConfigs, context, read);
    pageContextRequests.set(pageConfigs, { decided, read });
    return decided;
  };
  const decideNewPageConfigs = (context: Context) => {
    const pageConfigs = getPageConfigs();
    return pageContextRequests.get(pageConfigs)?.decided ?? decideRequests(pageConfigs, context);
  };
  const decide: Plugin = {
    name: "vike-react-rsc:placement",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    // Vite resolved its config again, e.g. its dev server restarted: Vike forgot the values set, on the same page configs
    configResolved: () => {
      pageContextRequests = new WeakMap();
    },
    resolveId: {
      // Before plugin-rsc's, which resolves the import with the react-server condition
      order: "pre",
      async handler(source, importer) {
        if (source.startsWith(`\0${CLIENT_IMPORT}`)) return source;
        if (this.environment.name !== "rsc" || !isPageEntry(importer) || !isClientDefault()) return;
        // A client component that the rsc env resolves to another file than the browser: its client reference is the import
        const clientImport = (await resolveComponentConfigs(this)).clientImports.get(source);
        if (!clientImport) return;
        const { importer: configFile, exportNames } = clientImport;
        // From the root, so the build doesn't depend on where the app is
        const query = { exports: exportNames.join(","), ...(configFile && { importer: path.relative(this.environment.config.root, configFile) }) };
        return `\0${CLIENT_IMPORT}${source}?${new URLSearchParams(query)}`;
      },
    },
    // Each env loads the file its own conditions give: the browser its file, the HTML render Node's
    async load(id) {
      // Before Vike's load, which serializes the pages' configs: a build refuses a value set after it
      if (isVikeVirtualModule(id)) {
        await decideNewPageConfigs(this);
        return;
      }
      if (!id.startsWith(`\0${CLIENT_IMPORT}`)) return;
      const [importPath, query] = id.slice(CLIENT_IMPORT.length + 1).split("?") as [string, string];
      const params = new URLSearchParams(query);
      const importer = params.has("importer") ? path.resolve(this.environment.config.root, params.get("importer")!) : undefined;
      const exportNames = params.get("exports")!.split(",");
      const file = this.environment.name === "client" ? await resolveForBrowser(importPath, importer) : (await this.resolve(importPath, importer))?.id;
      return `"use client";\nexport { ${exportNames.join(", ")} } from ${JSON.stringify(file ?? importPath)};\n`;
    },
    async transform(code, id) {
      // After Vike's load, which waits for the page configs of a + file that was just added or removed: in dev, a value set on page
      // configs that Vike has serialized reloads the browser
      if (isVikeVirtualModule(id)) {
        await decideNewPageConfigs(this);
        return;
      }
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
      const decision = await decideIsServerComponent(getFile(id), directives, components, this);
      getDecisions(this.environment.name).set(getFile(id), decision);
      // On the first line, so the source map stays valid
      if (isRsc && directives.length === 0 && !decision.isServerComponent) return { code: `"use client";${code}`, map: null };
      if (!isRsc && decision.isServerComponent) return getServerComponentStub(components, getServerComponentFlags(id, decision, this.environment.config.root));
    },
    async hotUpdate({ type, file, read }) {
      const { environment } = this;
      invalidateModules(environment, type === "update" ? file : undefined);
      const decided = getDecisions(environment.name);
      if (type === "delete") {
        decided.delete(file);
        return;
      }
      const context = { environment, resolve: (source: string, importer?: string) => environment.pluginContainer.resolveId(source, importer) };
      const pageConfigs = getPageConfigs();
      // Before the reload below, which loads what it decides
      if (environment.name === "client" && pageContextRequests.get(pageConfigs)?.read.has(file)) {
        getModule(context, file, read);
        await decideRequests(pageConfigs, context);
      }
      const components = await getComponentConfigs(context);
      // Each Page, Layout, Wrapper or Loading that read the file to decide where it runs, the file itself included
      const changed: string[] = [];
      for (const [component, { isServerComponent, read: files }] of decided) {
        if (!files.has(file)) continue;
        // The file as the editor saved it, read once: read() waits for the content of a file that the editor empties first
        getModule(context, file, read);
        const { directives } = await getModule(context, component);
        if ((await decideIsServerComponent(component, directives, components(component) ?? [], context)).isServerComponent !== isServerComponent) changed.push(component);
      }
      if (changed.length > 0) {
        // The env loads the file as another kind of module, e.g. a stub instead of a client component: it starts over
        for (const component of changed) {
          decided.delete(component);
          for (const mod of environment.moduleGraph.getModulesByFile(component) ?? []) environment.moduleGraph.invalidateModule(mod);
        }
        environment.hot.send({ type: "full-reload", triggeredBy: file });
        return [];
      }
      // Outside the rsc env, the edit leaves a server component's stub as it was: the rsc env's update refetches the Flight
      if (decided.get(file)?.isServerComponent && environment.name !== "rsc") return [];
    },
  };
  const tag: Plugin = {
    name: "vike-react-rsc:tag-server-components",
    // After plugin-rsc's CSS wrapper, which replaces the export with a function that doesn't have the flags
    enforce: "post",
    async transform(code, id) {
      if (this.environment.name !== "rsc") return;
      const decision = getDecisions("rsc").get(getFile(id));
      const components = (await getComponentConfigs(this))(id);
      if (!decision?.isServerComponent || !components) return;
      return tagServerComponent(code, await parse(code, id), components, getServerComponentFlags(id, decision, this.environment.config.root));
    },
  };
  return [decide, tag];
}

type Decision = { isServerComponent: boolean; serverComponentImport?: string[]; read: Set<string> };

// Where the env runs a Page, Layout, Wrapper or Loading, the server component import that decides it if any, and the files read
async function decideIsServerComponent(
  file: string,
  directives: Directive[],
  components: Part[],
  context: Context
): Promise<Decision> {
  // By its directive, or as the file the env loads for a package's server component
  if (directives.includes("use server component") || components.some((c) => c.isPackageServerComponent)) {
    return { isServerComponent: true, read: new Set([file]) };
  }
  if (directives.length > 0 || !isClientDefault() || !isAppFile(file)) return { isServerComponent: false, read: new Set([file]) };
  const { serverComponentImport, read } = await findServerComponentImport(file, (file) => getModule(context, file));
  return { isServerComponent: serverComponentImport !== undefined, serverComponentImport, read };
}

// Under 'client', a client navigation asks the server only for a page that renders a server component or has a hook that can run
// there
async function decidePageContextRequests(pageConfigs: PageConfigs, context: Context, read: Set<string>): Promise<void> {
  await Promise.all(
    pageConfigs.map(async (pageConfig) => {
      // A check that fails keeps the request, which is always safe. An invalid `components` is reported where it is used
      setNeedsPageContextRequest(pageConfig, await needsPageContextRequest(pageConfig, context, read).catch(() => true));
    })
  );
}

async function needsPageContextRequest(pageConfig: PageConfig, context: Context, read: Set<string>): Promise<boolean> {
  // Under 'server', each page renders from its Flight. And a browser error fetches the error page's pageContext from the server
  if (!isClientDefault() || pageConfig.isErrorPage || hasAppServerHook(pageConfig)) return true;
  for (const { appFile, importPath, importer } of getPagePartImports(pageConfig)) {
    // As the browser resolves it: its file says where a package's component runs
    const id = appFile ?? (importPath && (await resolveImport(context, importPath, importer)));
    if (!id) continue;
    const file = getFile(id);
    const { directives } = await getModule(context, file);
    const decision = await decideIsServerComponent(file, directives, [], context);
    for (const readFile of decision.read) read.add(readFile);
    if (decision.isServerComponent) return true;
  }
  return false;
}

function getServerComponentFlags(id: string, { serverComponentImport }: Decision, root: string): ServerComponentFlags {
  // For a file that is one because it imports a server component: the files from it to that server component
  const files = serverComponentImport?.map((imported) => getFileName(imported, root));
  return { isServerComponent: true, file: path.relative(root, getFile(id)), serverComponentImport: files };
}

// Outside the rsc env, a server Page, Layout, Wrapper or Loading: the page renders from its Flight, which has what it
// rendered. Each export Vike reads, a + file's default one, whatever the file exports itself
function getServerComponentStub(components: Part[], flags: ServerComponentFlags) {
  const exports = [...new Set(components.map(({ exportName = "default" }) => `stub as ${exportName}`))].join(", ");
  return { code: `const stub = Object.assign(() => null, ${JSON.stringify(flags)});\nexport { ${exports} };`, map: null };
}

// In the rsc env, a server Page, Layout, Wrapper or Loading carries the stub's flags, so every env finds it the same way
function tagServerComponent(code: string, program: ESTree.Program, components: Part[], flags: ServerComponentFlags) {
  // The exports Vike reads: each import's, or a + file's default one or the one named after the config
  const exportNames = [...new Set(components.flatMap(({ configName, exportName }) => (exportName ? [exportName] : [configName, "default"])))];
  const configNames = [...new Set(components.map(({ configName }) => configName))].join(" or ");
  const { output, references } = transformModuleExportEffect(code, program, {
    generate: ({ binding }) => `Object.assign(${binding}, ${JSON.stringify(flags)})`,
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
      `[vike-react-rsc] ${flags.file} starts with "use server component", but ${statement} doesn't name its ${configNames}: ` +
        `write ${exportNames.map((name) => `export { ${name} } from ${source}`).join(" or ")}`
    );
  }
  return { code: output.toString(), map: output.generateMap({ hires: "boundary" }) };
}
