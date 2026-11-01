import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isModuleFile, startsWithDirective } from "./parse";
import { findPackage } from "./serverComponentImports";

/** The files in `dir` that start with `"use client"`, outside node_modules, hidden directories and `outDir` */
export async function findClientComponentFiles(dir: string, outDir?: string): Promise<string[]> {
  // A folder the user can't read, such as a database's Docker volume, is skipped
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "node_modules" || entry.name.startsWith(".") || file === outDir ? [] : findClientComponentFiles(file, outDir);
      }
      if (!isModuleFile(file)) return [];
      // A file that can't be read, such as an editor's lock file, is skipped, and one that doesn't parse is left to Vite, which shows its error once the file loads
      const isClientComponent = await readFile(file, "utf8").then((code) => startsWithUseClient.test(code) && startsWithDirective(code, file, "use client")).catch(() => false);
      return isClientComponent ? [file] : [];
    })
  );
  return files.flat();
}

// Only a file with "use client" before its code is parsed, as parsing a package's large builds, such as react-dom's, takes long
const startsWithUseClient = /^(?:#!.*)?(?:\s|\/\/.*[\r\n]|\/\*(?:[^*]|\*(?!\/))*\*\/|(["'])use [a-z ]+\1;?)*(["'])use client\2/;

/** The app's dependencies, as its package.json lists them, that have a file starting with `"use client"` */
export async function findClientPackages(root: string): Promise<string[]> {
  // A root without one, when a parent folder's package.json lists the app's dependencies, lists none
  const { dependencies = {} } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8").catch(() => "{}"));
  const found = await Promise.all(
    Object.keys(dependencies).map(async (name) => {
      const dir = await findPackage(name, root);
      return dir && (await hasMainEntry(dir)) && (await findClientComponentFiles(dir)).length > 0 ? [name] : [];
    })
  );
  return found.flat();
}

// Vite pre-bundles a package by its name from its main entry, and one that exports only subpaths, e.g. "./client", stops dev from starting
async function hasMainEntry(dir: string): Promise<boolean> {
  const { exports } = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  return typeof exports !== "object" || exports === null || "." in exports || !Object.keys(exports).some((key) => key.startsWith("."));
}
