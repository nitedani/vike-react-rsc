import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createIdResolver, type Environment, type ResolvedConfig } from "vite";
import { getDirectives, getImportSources, isModuleFile, parseCompiled, startsWithDirective } from "./parse";

/** What the browser loads through the client references of the app's server components: the app's files that start with
 * `"use client"`, outside node_modules, hidden directories and `outDir`, and each import that plugin-rsc has the browser make by
 * its name: one, of the app's files or of the linked packages they import, that the rsc env resolves to a package's file that
 * starts with `"use client"`, the same file as from the app's root */
export async function findClientReferences(rsc: Environment, outDir: string): Promise<{ files: string[]; packageImports: string[] }> {
  const { root } = rsc.config;
  const resolve = createResolver(rsc);
  const clientFiles = new Map<string, Promise<boolean>>();
  const isClientFile = (file: string) => clientFiles.get(file) ?? clientFiles.set(file, isPackageClientFile(file)).get(file)!;
  const modules = await readAppModules(root, outDir, rsc.config);
  const files = modules.flatMap(({ file, directives }) => (directives.includes("use client") ? [file] : []));
  const read = new Set(modules.map(({ file }) => file));
  const packageImports = new Set<string>();
  const readImports = async ({ file, sources }: AppModule): Promise<void> => {
    await Promise.all(
      sources.map(async (source) => {
        const isBare = bareImport.test(source);
        if (!isBare && !(source.startsWith(".") && isOutside(path.resolve(path.dirname(file), source), root))) return;
        // An import the rsc env can't resolve, e.g. a client file's of a package only for the browser, isn't a server component's
        const resolved = await resolve(source, file);
        if (!resolved || !path.isAbsolute(resolved)) return;
        if (resolved.includes("/node_modules/")) {
          // plugin-rsc imports by name only a file in node_modules that resolves alike from the app's root
          if (isBare && (await resolve(source, path.join(root, "index.html"))) === resolved && (await isClientFile(resolved))) packageImports.add(source);
        } else if (isOutside(resolved, root) && isModuleFile(resolved) && !read.has(resolved)) {
          // A linked package, such as a workspace one, is served from its files, so its server components' imports count too
          read.add(resolved);
          const module = await readModule(resolved, rsc.config);
          if (module) await readImports(module);
        }
      })
    );
  };
  await Promise.all(modules.map(readImports));
  return { files, packageImports: [...packageImports] };
}

// A package's name, e.g. "@mui/material/Button", not a path, "node:fs" or an alias such as "@/components"
const bareImport = /^(?!\.)(?:@[\w.-]+\/)?[\w.-]+(?:\/[^:]*)?$/;

function createResolver(environment: Environment): (source: string, importer: string) => Promise<string | undefined> {
  const resolveId = createIdResolver(environment.getTopLevelConfig());
  const resolved = new Map<string, Promise<string | undefined>>();
  return (source, importer) => {
    // An import resolves alike from every file of a folder, e.g. "react" from a folder of 2,000 components
    const key = `${path.dirname(importer)}\0${source}`;
    return resolved.get(key) ?? resolved.set(key, resolveId(environment, source, importer).catch(() => undefined)).get(key)!;
  };
}

async function isPackageClientFile(file: string): Promise<boolean> {
  if (!isModuleFile(file)) return false;
  return readFile(file, "utf8")
    .then((code) => startsWithDirective(code, file, "use client"))
    .catch(() => false);
}

function isOutside(file: string, dir: string): boolean {
  const relative = path.relative(dir, file);
  return relative.startsWith("..") || path.isAbsolute(relative);
}

type AppModule = { file: string; directives: string[]; sources: string[] };

async function readAppModules(dir: string, outDir: string, config: ResolvedConfig): Promise<AppModule[]> {
  // A folder the user can't read, such as a database's Docker volume, is skipped
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const modules = await Promise.all(
    entries.map(async (entry): Promise<AppModule[]> => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "node_modules" || entry.name.startsWith(".") || file === outDir ? [] : readAppModules(file, outDir, config);
      }
      const module = isModuleFile(file) && (await readModule(file, config));
      return module ? [module] : [];
    })
  );
  return modules.flat();
}

async function readModule(file: string, config: ResolvedConfig): Promise<AppModule | undefined> {
  // A file that can't be read, such as an editor's lock file, is skipped, and one that doesn't parse is left to Vite, which shows its error once the file loads
  const program = await readFile(file, "utf8")
    .then((code) => parseCompiled(code, file, config))
    .catch(() => undefined);
  return program && { file, directives: getDirectives(program), sources: getImportSources(program) };
}
