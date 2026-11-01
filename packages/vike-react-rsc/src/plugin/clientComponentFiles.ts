import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isModuleFile, startsWithDirective } from "./parse";

/** The app's files that start with `"use client"`, outside node_modules, hidden directories and the build output */
export async function findClientComponentFiles(dir: string, outDir: string): Promise<string[]> {
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
      const isClientComponent = await readFile(file, "utf8").then((code) => startsWithDirective(code, file, "use client")).catch(() => false);
      return isClientComponent ? [file] : [];
    })
  );
  return files.flat();
}
