import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { Visitor, type ESTree, type Plugin } from "vite";
import {
  getBindings,
  getDirectives,
  getExportNames,
  getFile,
  getImports,
  isAppFile,
  isComponentFile,
  isPlusComponentFile,
  parse,
  readDirectives,
  readProgram,
} from "./parse";

type Resolve = (source: string, importer?: string) => Promise<string | undefined>;

/** Under `components: 'client'`, an unmarked .jsx or .tsx file, +Page, +Layout or +Wrapper is a client component, and
 * `"use server component"` marks a server component */
export function clientDefault(): Plugin {
  // Whether the file had the marker when the env last transformed it, by env and file
  const isMarked = new Map<string, boolean>();
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    configResolved() {
      // Under 'server', every page renders from its Flight, which only the server renders
      const ssrFalse = !isClientDefault() && Object.values(getVikeConfig().pages).find((page) => page.config.ssr === false);
      if (ssrFalse) warnOnce(`${ssrFalse._source.ssr!.definedAt} sets ssr to false, which applies only under components: 'client'`);
    },
    async transform(code, id) {
      if (!isAppFile(id) || !isClientDefault()) return;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      if (isComponentFile(id)) isMarked.set(`${this.environment.name}:${getFile(id)}`, directives.includes("use server component"));
      const root = this.environment.config.root;
      const file = path.relative(root, getFile(id));
      const resolve: Resolve = async (source, importer = id) => (await this.resolve(source, importer))?.id;
      if (this.environment.name === "rsc") {
        // On the first line, so the source map stays valid
        if (isComponentFile(id) && directives.length === 0) return { code: `"use client";${code}`, map: null };
        if (directives.includes("use client")) return;
        const error = await findClientFunctionCall(program, file, resolve, root);
        if (error) this.error(error);
        return;
      }
      if (directives.includes("use server component")) return isPlusComponentFile(id) ? getServerComponentStub(program, id, file) : undefined;
      if (directives.includes("use server")) return;
      // Not a client component, e.g. a barrel or +data.ts
      if (!isComponentFile(id) && !directives.includes("use client")) return;
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

// A build resolves the Vite config more than once
const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[vike-react-rsc][Warning] ${message}`);
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
function getServerComponentStub(program: ESTree.Program, id: string, file: string) {
  const stub = `Object.assign(() => null, { isServerComponent: true, file: ${JSON.stringify(file)} })`;
  const hasDefaultExport = program.body.some((statement) => statement.type === "ExportDefaultDeclaration");
  const name = path.basename(getFile(id)).split(".")[0]!.slice(1);
  return { code: hasDefaultExport ? `export default ${stub};` : `export const ${name} = ${stub};`, map: null };
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

// A client component's imports load in the browser, where a server component can't render, so no binding it imports may
// come from a server component file, directly or re-exported by modules that aren't components, e.g. a barrel
async function findServerComponentImport(program: ESTree.Program, file: string, resolve: Resolve, root: string) {
  for (const { source, imported } of getBindings(program)) {
    const resolved = await resolve(source);
    const files = resolved && (await findServerComponentFile(resolved, imported, resolve));
    if (!files) continue;
    const chain = files.map((id) => path.relative(root, getFile(id))).join(", which re-exports ");
    return `${file} imports ${chain}, which starts with "use server component", so it's a client component importing a server component: start ${file} with "use server component" too`;
  }
}

// The modules from `id` to the server component file that defines its export `name` ("*" for any)
async function findServerComponentFile(id: string, name: string, resolve: Resolve, seen = new Set<string>()): Promise<string[] | undefined> {
  if (!isAppFile(id) || seen.has(`${id}:${name}`)) return;
  seen.add(`${id}:${name}`);
  const program = await readProgram(id);
  const directives = getDirectives(program);
  if (directives.includes("use server component")) return name === "*" || getExportNames(program).includes(name) ? [id] : undefined;
  // A component checks its own imports, and a "use server" module's exports are references in the browser
  if (directives.length > 0 || isComponentFile(id)) return;
  for (const { source, imported, exported } of getBindings(program)) {
    if (!exported || (name !== "*" && exported !== "*" && exported !== name)) continue;
    const resolved = await resolve(source, id);
    const files = resolved && (await findServerComponentFile(resolved, exported === "*" ? name : imported, resolve, seen));
    if (files) return [id, ...files];
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
