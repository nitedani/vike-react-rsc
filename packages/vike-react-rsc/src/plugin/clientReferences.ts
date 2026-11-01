import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ResolvedConfig } from "vite";
import { getDirectives, getImportSources, isModuleFile, parseCompiled, startsWithDirective } from "./parse";

/** What the browser loads through the client references of the app's server components: the app's files that start with
 * `"use client"`, outside node_modules, hidden directories and `outDir`, and each import of the app's files that resolves to a
 * package's file that starts with `"use client"`, as plugin-rsc imports it by that name in the browser */
export async function findClientReferences(
  root: string,
  outDir: string,
  config: ResolvedConfig,
  resolve: (source: string, importer: string) => Promise<string | undefined>
): Promise<{ files: string[]; packageImports: string[] }> {
  const modules = await readAppModules(root, outDir, config);
  const files = modules.flatMap(({ file, directives }) => (directives.includes("use client") ? [file] : []));
  const packageImports = await Promise.all(
    modules.flatMap(({ file, sources }) =>
      sources
        .filter((source) => bareImport.test(source))
        .map(async (source) => {
          // An import the browser can't resolve, e.g. of a package whose "." is only for "node", fails on its page, not here
          const resolved = await resolve(source, file).catch(() => undefined);
          return resolved && (await isPackageClientFile(resolved)) ? [source] : [];
        })
    )
  );
  return { files, packageImports: [...new Set(packageImports.flat())] };
}

// A package's name, e.g. "@mui/material/Button", not a path, "node:fs" or an alias such as "@/components"
const bareImport = /^(?!\.)(?:@[\w.-]+\/)?[\w.-]+(?:\/[^:]*)?$/;

// A linked package, such as a workspace one, is outside node_modules: Vite and plugin-rsc serve it unbundled
async function isPackageClientFile(file: string): Promise<boolean> {
  if (!file.includes("/node_modules/") || !isModuleFile(file)) return false;
  return readFile(file, "utf8")
    .then((code) => startsWithDirective(code, file, "use client"))
    .catch(() => false);
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
      if (!isModuleFile(file)) return [];
      // A file that can't be read, such as an editor's lock file, is skipped, and one that doesn't parse is left to Vite, which shows its error once the file loads
      const program = await readFile(file, "utf8")
        .then((code) => parseCompiled(code, file, config))
        .catch(() => undefined);
      return program ? [{ file, directives: getDirectives(program), sources: getImportSources(program) }] : [];
    })
  );
  return modules.flat();
}
