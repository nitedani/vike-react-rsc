import { readFile } from "node:fs/promises";
import { getVikeConfig } from "vike/plugin";
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
      const resolve = async (importPath: string) => (await this.resolve(importPath))?.id;
      if (this.environment.config.command === "build" && !(await usesLoadingBoundary(resolve))) return "export const LoadingBoundary = undefined;";
      return `export { LoadingBoundary } from "vike-react-rsc/__internal/LoadingBoundary";`;
    },
  };
}

/** Whether every page wraps each layer in LoadingBoundary: under 'client', or when a page's Loading starts with "use client" */
async function usesLoadingBoundary(resolve: (importPath: string) => Promise<string | undefined>): Promise<boolean> {
  if (isClientDefault()) return true;
  // Each page's +Loading file, or the file its +config imports Loading from
  const sources = getVikeConfig().dangerouslyUseInternals._pageConfigs.flatMap((page) => page.configValueSources.Loading ?? []);
  for (const { definedAt } of sources) {
    if (definedAt.definedBy) continue;
    // null for an import through a path alias
    const file = definedAt.filePathAbsoluteFilesystem ?? (await resolve(definedAt.importPathAbsolute));
    if (file && getDirectives(await parse(await readFile(file, "utf8"), file)).includes("use client")) return true;
  }
  return false;
}
