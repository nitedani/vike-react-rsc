import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { Environment, ResolvedConfig } from "vite";
import packageJson from "../../package.json";
import { resolveForBrowser, type ResolveContext } from "./componentConfigs";
import { getDirectives, getImportSources, isModuleFile, parseCompiled, type Directive } from "./parse";

/** The first "use server component" file that `file` imports, through files without a directive, as the files from `file` to
 * it, and every file read to find it */
export async function findServerComponentImport(file: string, getModule: GetModule): Promise<{ serverComponentImport?: string[]; read: Set<string> }> {
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
  const getModule = (file: string) => readModule(file, () => readFile(file, "utf8"), config, (source) => resolveImport(context, source, file));
  return (await findServerComponentImport(file, getModule)).serverComponentImport !== undefined;
}

/** An import as the browser resolves it, so a walk reads the files the browser would load, without registering the packages
 * for Vite to pre-bundle; or else as the env's plugins do, e.g. vite-tsconfig-paths */
export async function resolveImport(context: ResolveContext, source: string, importer: string): Promise<string | undefined> {
  return (await resolveForBrowser(source, importer)) ?? (await context.resolve(source, importer))?.id;
}

// A file that doesn't parse has neither: its own transform reports why
export async function readModule(
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

export type WalkedModule = { directives: Directive[]; imports: string[] };
export type GetModule = (file: string) => Promise<WalkedModule>;
/** Whether a file of the package names "use server component", and the directory of each package it depends on */
type Package = { namesServerComponent: boolean; dependencies: string[] };
// By the package's directory: its files stay as installed
const packages = new Map<string, Promise<Package>>();
// vike-react-rsc and the packages it runs on, which import none of the app's server components
const frameworkPackages = new Set([packageJson.name, ...Object.keys({ ...packageJson.dependencies, ...packageJson.peerDependencies })]);
