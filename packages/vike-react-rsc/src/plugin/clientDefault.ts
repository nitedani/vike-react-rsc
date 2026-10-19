import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import type { ESTree, Plugin } from "vite";
import { getDirectives, getFile, isAppFile, isPlusComponentFile, parse } from "./parse";

/** A file runs where the file that imports it runs, and a +Page, +Layout or +Wrapper where `components` says, unless
 * `"use client"` at its top puts it in the browser or `"use server component"` on the server */
export function clientDefault(): Plugin {
  // Whether the file had the marker when the env last transformed it, by env and file
  const isMarked = new Map<string, boolean>();
  // The server component files the client build loads, other than + files
  const serverComponentsInBrowser = new Set<string>();
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
      if (!isAppFile(id)) return;
      if (!isPlusComponentFile(id)) {
        if (this.environment.name !== "client" || !(await isServerComponentFile(code, id))) return;
        // The build knows every importer once it has loaded all modules
        if (this.environment.mode !== "dev") return void serverComponentsInBrowser.add(id);
        const { moduleGraph } = this.environment;
        const chain = getImportChain(id, (id) => [...(moduleGraph.getModuleById(id)?.importers ?? [])][0]?.id ?? undefined);
        this.error(getServerComponentInBrowserError(chain, this.environment.config.root));
      }
      // Under 'server', plugin-rsc's own rule: a file without "use client" is a server component
      if (!isClientDefault()) return;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      isMarked.set(`${this.environment.name}:${getFile(id)}`, directives.includes("use server component"));
      if (this.environment.name === "rsc") {
        // On the first line, so the source map stays valid
        if (directives.length === 0) return { code: `"use client";${code}`, map: null };
        return;
      }
      if (directives.includes("use server component")) return getServerComponentStub(program, id, path.relative(this.environment.config.root, getFile(id)));
    },
    buildEnd() {
      if (this.environment.name !== "client") return;
      for (const id of serverComponentsInBrowser) {
        const chain = getImportChain(id, (id) => this.getModuleInfo(id)?.importers[0]);
        this.error(getServerComponentInBrowserError(chain, this.environment.config.root));
      }
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

async function isServerComponentFile(code: string, id: string): Promise<boolean> {
  return code.includes("use server component") && getDirectives(await parse(code, id)).includes("use server component");
}

// `id`, then its first importer, and so on up to the first + file of a component, the way plugin-rsc reports server-only
function getImportChain(id: string, getImporter: (id: string) => string | undefined): string[] {
  const chain: string[] = [];
  for (let next: string | undefined = id; next && isAppFile(next) && !chain.includes(next); next = getImporter(next)) {
    chain.push(next);
    if (isPlusComponentFile(next)) break;
  }
  return chain;
}

// A server component renders only on the server: the browser loading its file means its importers have to move there
function getServerComponentInBrowserError(chain: string[], root: string): string {
  const [file, ...importers] = chain.map((id) => path.relative(root, getFile(id)));
  const importer = importers.pop();
  if (!importer) return `${file} starts with "use server component", but the browser loads it`;
  const through = importers.length > 0 ? ` through ${importers.reverse().join(", ")}` : "";
  const fix = isPlusComponentFile(chain.at(-1)!) ? `start ${importer} with "use server component"` : "import it only from server components";
  const typesOnly = `if ${path.relative(root, getFile(chain[1]!))} imports only its types, write \`import type\``;
  return `${file} starts with "use server component", but the browser loads it: ${importer} imports it${through}: ${fix}, or, ${typesOnly}`;
}
