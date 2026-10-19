import { hasDirective } from "@vitejs/plugin-rsc/transforms";
import path from "node:path";
import { parseAstAsync, type ESTree } from "vite";

const langs = { ".js": "js", ".mjs": "js", ".cjs": "js", ".jsx": "jsx", ".ts": "ts", ".mts": "ts", ".cts": "ts", ".tsx": "tsx" } as const;
const directives = ["use client", "use server", "use server component"] as const;
export type Directive = (typeof directives)[number];

/** The module as the user wrote it, JSX and TypeScript included */
export function parse(code: string, id: string): Promise<ESTree.Program> {
  return parseAstAsync(code, { lang: langs[path.extname(getFile(id)) as keyof typeof langs] });
}

/** The directives of the module's prologue that say where it runs */
export function getDirectives(program: ESTree.Program): Directive[] {
  return directives.filter((directive) => hasDirective(program.body, directive));
}

/** A .jsx or .tsx file of the app, not of a package */
export function isComponentFile(id: string): boolean {
  const file = getFile(id);
  return /\.[jt]sx$/.test(file) && !file.includes("/node_modules/");
}

export function getFile(id: string): string {
  return id.split("?")[0]!;
}
