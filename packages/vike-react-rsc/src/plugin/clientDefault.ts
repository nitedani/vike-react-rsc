import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { Visitor, type ESTree, type Plugin } from "vite";
import { getDirectives, getFile, getImports, getImportSources, isAppFile, isComponentFile, isPlusComponentFile, parse, readDirectives } from "./parse";

type Resolve = (source: string) => Promise<string | undefined>;

/** Under `components: 'client'`, an unmarked .jsx or .tsx file is a client component, and `"use server component"` marks
 * a server component */
export function clientDefault(): Plugin {
  // Whether the file had the marker when the env last transformed it, by env and file
  const isMarked = new Map<string, boolean>();
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      if (!isAppFile(id) || !isClientDefault()) return;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      if (isComponentFile(id)) isMarked.set(`${this.environment.name}:${getFile(id)}`, directives.includes("use server component"));
      const root = this.environment.config.root;
      const file = path.relative(root, getFile(id));
      const resolve: Resolve = async (source) => (await this.resolve(source, id))?.id;
      if (this.environment.name === "rsc") {
        // On the first line, so the source map stays valid
        if (isComponentFile(id) && directives.length === 0) return { code: `"use client";${code}`, map: null };
        if (directives.includes("use client")) return;
        const error = await findClientFunctionCall(program, file, resolve, root);
        if (error) this.error(error);
        return;
      }
      if (directives.includes("use server component")) {
        if (!isPlusComponentFile(id)) return;
        const error = findSsrFalsePage(getFile(id), root);
        if (error) this.error(error);
        return getServerComponentStub(program, id);
      }
      if (directives.includes("use server")) return;
      // Not a client component, e.g. a barrel or +data.ts
      if (!isComponentFile(id) && !isPlusComponentFile(id) && !directives.includes("use client")) return;
      const error = await findServerComponentImport(program, file, resolve, root);
      if (error) this.error(error);
    },
    async hotUpdate({ file, read }) {
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

// Outside the rsc env, a server Page, Layout or Wrapper: the page renders from its Flight, which has what it rendered
function getServerComponentStub(program: ESTree.Program, id: string) {
  const stub = "Object.assign(() => null, { isServerComponent: true })";
  const hasDefaultExport = program.body.some((statement) => statement.type === "ExportDefaultDeclaration");
  const name = path.basename(getFile(id)).split(".")[0]!.slice(1);
  return { code: hasDefaultExport ? `export default ${stub};` : `export const ${name} = ${stub};`, map: null };
}

// A page with `ssr: false` renders only in the browser, where its server components can't render
function findSsrFalsePage(file: string, root: string) {
  for (const { pageId, configValueSources: sources } of getVikeConfig().dangerouslyUseInternals._pageConfigs) {
    const ssr = sources.ssr?.[0];
    if (!ssr?.valueIsLoaded || ssr.value !== false) continue;
    // A page has one Page, and all its Layouts and Wrappers
    const components = [sources.Page?.[0], ...(sources.Layout ?? []), ...(sources.Wrapper ?? [])];
    if (!components.some((source) => source && "filePathAbsoluteFilesystem" in source.definedAt && source.definedAt.filePathAbsoluteFilesystem === file)) continue;
    return `${path.relative(root, file)} starts with "use server component", so it renders on the server, but the page ${pageId} sets ssr to false, so it renders only in the browser: remove "use server component" or ssr: false`;
  }
}

// In the rsc env, what a server module imports from a client component file is a client reference, which throws when
// called
async function findClientFunctionCall(program: ESTree.Program, file: string, resolve: Resolve, root: string) {
  const imports = getImports(program);
  for (const [name, call] of getCalls(program)) {
    const source = imports.get(name);
    const resolved = source && (await resolve(source));
    if (!resolved || !isComponentFile(resolved) || (await readDirectives(resolved)).length > 0) continue;
    const from = path.relative(root, getFile(resolved));
    const fix = /^use[A-Z]/.test(call)
      ? `a hook runs only in a client component`
      : `move it to a .js or .ts file, or start ${from} with "use server component"`;
    return `${file} calls ${call}() from ${from}, which is a client component file, so it can't run on the server: ${fix}`;
  }
}

// A client component's imports load in the browser, where a server component can't render
async function findServerComponentImport(program: ESTree.Program, file: string, resolve: Resolve, root: string) {
  for (const source of getImportSources(program)) {
    const resolved = await resolve(source);
    if (!resolved || !isComponentFile(resolved) || !(await readDirectives(resolved)).includes("use server component")) continue;
    return `${file} imports ${path.relative(root, getFile(resolved))}, which starts with "use server component", so it's a client component importing a server component: start ${file} with "use server component" too`;
  }
}

// The functions the module calls, by the local name they're called through: `badge` for `badge()` and `ui` for `ui.badge()`
function getCalls(program: ESTree.Program): Map<string, string> {
  const calls = new Map<string, string>();
  new Visitor({
    CallExpression: ({ callee }) => {
      if (callee.type === "Identifier") calls.set(callee.name, callee.name);
      if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.property.type === "Identifier") {
        calls.set(callee.object.name, `${callee.object.name}.${callee.property.name}`);
      }
    },
  }).visit(program);
  return calls;
}
