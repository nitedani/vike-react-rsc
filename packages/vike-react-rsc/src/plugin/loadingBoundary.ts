import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import { isClientDefault } from "./clientDefault";
import { getDirectives, parse } from "./parse";

// getPageElement() imports it: LoadingBoundary in an app that needs it, so a components: 'server' app without a client +Loading doesn't ship it
const LOADING_BOUNDARY = "virtual:vike-react-rsc/LoadingBoundary";

/** Resolves getPageElement()'s LoadingBoundary: the component when every page wraps each layer in it, else `undefined` */
export function loadingBoundary(): Plugin {
  return {
    name: "vike-react-rsc:loading-boundary",
    resolveId: (id) => (id === LOADING_BOUNDARY ? `\0${LOADING_BOUNDARY}` : undefined),
    // The same answer in every env. In dev always: the page looks the same, and adding a client +Loading needs no restart.
    async load(id) {
      if (id !== `\0${LOADING_BOUNDARY}`) return;
      const { command, root } = this.environment.config;
      if (command === "build" && !(await usesLoadingBoundary(root))) return "export const LoadingBoundary = undefined;";
      return `export { LoadingBoundary } from "vike-react-rsc/__internal/LoadingBoundary";`;
    },
  };
}

/** Whether every page wraps each layer in LoadingBoundary: under 'client', or when a +Loading starts with "use client" */
async function usesLoadingBoundary(root: string): Promise<boolean> {
  if (isClientDefault()) return true;
  for (const file of getPlusFiles(root, "Loading")) {
    if (getDirectives(await parse(await readFile(file, "utf8"), file)).includes("use client")) return true;
  }
  return false;
}

function getPlusFiles(dir: string, name: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return getPlusFiles(file, name);
    return entry.name.startsWith(`+${name}.`) ? [file] : [];
  });
}
