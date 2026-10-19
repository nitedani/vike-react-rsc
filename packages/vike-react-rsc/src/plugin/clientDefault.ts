import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { Visitor, type ESTree, type Plugin } from "vite";
import { getDirectives, getFile, getImports, isAppFile, isPlusComponentFile, parse } from "./parse";

/** A file runs where the file that imports it runs, and a +Page, +Layout, +Wrapper or +Loading's `layout` where `components` says, unless
 * `"use client"` at its top puts it in the browser or `"use server component"` on the server */
export function clientDefault(): Plugin {
  // Whether the file had the marker when the env last transformed it, by env and file
  const isMarked = new Map<string, boolean>();
  // The server component files the client build loads, other than + files
  const serverComponentsInBrowser = new Set<string>();
  // Under 'client', as configResolved() found it: in hotUpdate(), getVikeConfig() is still the config before the edit
  let checksConfigFiles = false;
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async configResolved({ root }) {
      // Under 'server', every page renders from its Flight, which only the server renders
      const ssrFalse = !isClientDefault() && Object.values(getVikeConfig().pages).find((page) => page.config.ssr === false);
      if (ssrFalse) warnOnce(`${ssrFalse._source.ssr!.definedAt} sets ssr to false, which applies only under components: 'client'`);
      checksConfigFiles = isClientDefault();
      if (checksConfigFiles) for (const file of getConfigFiles(root)) await assertComponentsInPlusFiles(file, await readFile(file, "utf8"), root);
    },
    async transform(code, id) {
      if (!isPlusComponentFile(id)) {
        if (!isAppFile(id) || this.environment.name !== "client" || !(await isServerComponentFile(code, id))) return;
        // The build knows every importer once it has loaded all modules
        if (this.environment.mode !== "dev") return void serverComponentsInBrowser.add(id);
        const { moduleGraph } = this.environment;
        const chain = getImportChain(id, (id) => [...(moduleGraph.getModuleById(id)?.importers ?? [])][0]?.id ?? undefined);
        this.error(getServerComponentInBrowserError(chain, this.environment.config.root));
      }
      if (this.environment.name === "rsc" && isAppFile(id) && path.basename(getFile(id)).startsWith("+Loading.")) {
        const program = await parse(code, id);
        const directives = getDirectives(program);
        // Its object would be a client reference here, which has no `layout`
        if (directives.includes("use client") || (isClientDefault() && directives.length === 0)) return getClientLoadingStub(program);
      }
      // Under 'server', plugin-rsc's own rule: a file without "use client" is a server component
      if (!isClientDefault()) return;
      // MDX has no directives, and its plugin has compiled it to JavaScript
      if (!isAppFile(id)) return this.environment.name === "rsc" ? { code: `"use client";${code}`, map: null } : undefined;
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
      // Vike reloads an edited +config file without restarting Vite, so configResolved() doesn't check it again. Logged: an
      // error thrown here would skip the hotUpdate() of the plugins after this one, Vike's included
      if (checksConfigFiles && this.environment.name === "client" && path.basename(file).startsWith("+config.")) {
        await assertComponentsInPlusFiles(file, await read(), this.environment.config.root).catch((error: Error) => this.environment.logger.error(error.message));
      }
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

// A component that a +config file imports has no + file of its own to say where it runs
async function assertComponentsInPlusFiles(file: string, code: string, root: string) {
  const program = await parse(code, file);
  const imports = getImports(program);
  new Visitor({
    Property: ({ key, computed, value }) => {
      const name = getKeyName({ key, computed });
      if (!name || !/^(Page|Layout|Wrapper|Loading)$/.test(name)) return;
      const isImport = value.type === "Identifier" ? imports.has(value.name) : value.type === "Literal" && String(value.value).startsWith("import:");
      if (!isImport) return;
      throw new Error(
        `[vike-react-rsc] ${path.relative(root, file)} sets ${name} by an import, but only a +${name} file runs where components says: export it from a +${name} file`
      );
    },
  }).visit(program);
}

function getConfigFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return getConfigFiles(file);
    return entry.name.startsWith("+config.") ? [file] : [];
  });
}

export function isClientDefault(): boolean {
  // One module is one component in the rsc env, so all pages have the same default
  const values = new Set(Object.values(getVikeConfig().pages).map((page) => page.config.components));
  if (values.size > 1) {
    throw new Error(`[vike-react-rsc] Set components once, in the root +config.js: pages set it to ${[...values].join(" and ")}`);
  }
  return values.has("client");
}

// Outside the rsc env, a server Page, Layout, Wrapper or Loading: the page renders from its Flight, which has what it rendered
function getServerComponentStub(program: ESTree.Program, id: string, file: string) {
  const stub = `Object.assign(() => null, { isServerComponent: true, file: ${JSON.stringify(file)} })`;
  const hasDefaultExport = program.body.some((statement) => statement.type === "ExportDefaultDeclaration");
  const name = path.basename(getFile(id)).split(".")[0]!.slice(1);
  return { code: hasDefaultExport ? `export default ${stub};` : `export const ${name} = ${stub};`, map: null };
}

// In the rsc env, a client +Loading: LoadingBoundary renders its layout, if it has one, where the file is loaded
function getClientLoadingStub(program: ESTree.Program) {
  const hasDefaultExport = program.body.some((statement) => statement.type === "ExportDefaultDeclaration");
  const exportLoading = (loading: string) => (hasDefaultExport ? `export default ${loading};` : `export const Loading = ${loading};`);
  return { code: `import { LoadingBoundary } from "vike-react-rsc/__internal/LoadingBoundary";\n${exportLoading("{ boundary: LoadingBoundary }")}`, map: null };
}

// `Layout` for `Layout:` and `"Layout":`, undefined for a key computed at runtime
function getKeyName({ key, computed }: { key: ESTree.PropertyKey; computed: boolean }): string | undefined {
  if (key.type === "Literal") return String(key.value);
  if (key.type === "Identifier" && !computed) return key.name;
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
