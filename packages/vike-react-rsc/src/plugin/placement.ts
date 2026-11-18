import { transformModuleExportEffect } from "@vitejs/plugin-rsc/transforms";
import path from "node:path";
import type { ESTree, Plugin } from "vite";
import type { ServerComponentFlags } from "../serverComponentFlags";
import { getComponentConfigs, isClientDefault, type Part } from "./componentConfigs";
import { getDirectives, getFile, getFileName, parse } from "./parse";
import { decideIsServerComponent, getEnvironmentContext, getModule, type Decision } from "./serverComponentImports";

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
  const decide: Plugin = {
    name: "vike-react-rsc:placement",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      const components = (await getComponentConfigs(this))(id);
      if (!components) return;
      const isRsc = this.environment.name === "rsc";
      const clientDefault = isClientDefault();
      // Under 'server', plugin-rsc's own rule: a file without "use client" is a server component. Of these, only a
      // Loading also loads outside the rsc env, so a server one gets the stub there, as under 'client'
      if (!clientDefault && isRsc) return;
      // MDX has no directives, and its plugin has compiled it to JavaScript
      if (/\.mdx?$/.test(getFile(id))) return isRsc ? { code: `"use client";${code}`, map: null } : undefined;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      const decision = await decideIsServerComponent(getFile(id), directives, components, clientDefault, this);
      getDecisions(this.environment.name).set(getFile(id), decision);
      // On the first line, so the source map stays valid
      if (isRsc && directives.length === 0 && !decision.isServerComponent) return { code: `"use client";${code}`, map: null };
      if (!isRsc && decision.isServerComponent) return getServerComponentStub(components, getServerComponentFlags(id, decision, this.environment.config.root));
    },
    async hotUpdate({ type, file, read }) {
      const { environment } = this;
      const decided = getDecisions(environment.name);
      if (type === "delete") {
        decided.delete(file);
        return;
      }
      const context = getEnvironmentContext(environment);
      const components = await getComponentConfigs(context);
      // Each Page, Layout, Wrapper or Loading that read the file to decide where it runs, the file itself included
      const changed: string[] = [];
      for (const [component, { isServerComponent, read: files }] of decided) {
        if (!files.has(file)) continue;
        // The file as the editor saved it, read once: read() waits for the content of a file that the editor empties first
        getModule(context, file, read);
        const { directives } = await getModule(context, component);
        const decision = await decideIsServerComponent(component, directives, components(component) ?? [], isClientDefault(), context);
        if (decision.isServerComponent !== isServerComponent) changed.push(component);
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
