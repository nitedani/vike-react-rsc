import { transformModuleExportEffect } from "@vitejs/plugin-rsc/transforms";
import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import type { ESTree, Plugin } from "vite";
import { getDirectives, getFile, isAppFile, isPlusComponentFile, parse } from "./parse";

/** A file runs where the file that imports it runs, and a +Page, +Layout, +Wrapper or +Loading's `layout` where `components` says, unless
 * `"use client"` at its top puts it in the browser or `"use server component"` on the server */
export function clientDefault(): Plugin {
  // Whether the file had the marker when the env last transformed it, by env and file
  const isMarked = new Map<string, boolean>();
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      if (!isPlusComponentFile(id)) return;
      const isRsc = this.environment.name === "rsc";
      // Under 'server', plugin-rsc's own rule: a file without "use client" is a server component. Of the + files, only a
      // +Loading also loads outside the rsc env, so a server one gets the stub there, as under 'client'
      if (!isClientDefault() && isRsc) return;
      // MDX has no directives, and its plugin has compiled it to JavaScript
      if (!isAppFile(id)) return isRsc ? { code: `"use client";${code}`, map: null } : undefined;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      const isServerComponent = directives.includes("use server component");
      isMarked.set(`${this.environment.name}:${getFile(id)}`, isServerComponent);
      // On the first line, so the source map stays valid
      if (isRsc && directives.length === 0) return { code: `"use client";${code}`, map: null };
      if (!isServerComponent) return;
      const file = path.relative(this.environment.config.root, getFile(id));
      return isRsc ? tagServerComponent(code, program, id, file) : getServerComponentStub(file);
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

// Outside the rsc env, a server Page, Layout, Wrapper or Loading: the page renders from its Flight, which has what it
// rendered. A default export, which Vike reads from any + file, whatever the file exports itself
function getServerComponentStub(file: string) {
  return { code: `export default Object.assign(() => null, ${getServerComponentFlags(file)});`, map: null };
}

// In the rsc env, a server Page, Layout, Wrapper or Loading carries the stub's flags, so every env finds it the same way
function tagServerComponent(code: string, program: ESTree.Program, id: string, file: string) {
  const configName = path.basename(getFile(id)).slice(1).split(".")[0];
  const { output, references } = transformModuleExportEffect(code, program, {
    generate: ({ binding }) => `Object.assign(${binding}, ${getServerComponentFlags(file)})`,
    // The exports Vike reads: the default one, or the one named after the config
    filter: (name) => name === "default" || name === configName,
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
        `write export { ${configName} } from ${source} or export { default } from ${source}`
    );
  }
  return { code: output.toString(), map: output.generateMap({ hires: "boundary" }) };
}

function getServerComponentFlags(file: string) {
  return `{ isServerComponent: true, file: ${JSON.stringify(file)} }`;
}
