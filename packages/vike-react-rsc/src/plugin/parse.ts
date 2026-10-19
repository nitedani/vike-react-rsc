import { hasDirective } from "@vitejs/plugin-rsc/transforms";
import { readFile } from "node:fs/promises";
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

/** The directives of a module that isn't being transformed, e.g. one the module being transformed imports */
export async function readDirectives(id: string): Promise<Directive[]> {
  const code = await readFile(getFile(id), "utf8");
  return /["']use /.test(code) ? getDirectives(await parse(code, id)) : [];
}

/** The source of each name the module imports: a default, named or namespace import */
export function getImports(program: ESTree.Program): Map<string, string> {
  const imports = new Map<string, string>();
  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue;
    for (const specifier of statement.specifiers) imports.set(specifier.local.name, String(statement.source.value));
  }
  return imports;
}

/** A JavaScript or TypeScript module of the app, not of a package */
export function isAppFile(id: string): boolean {
  const file = getFile(id);
  return !id.startsWith("\0") && path.extname(file) in langs && !file.includes("/node_modules/");
}

/** The + file of a Page, Layout, Wrapper or Loading, MDX included */
export function isPlusComponentFile(id: string): boolean {
  return /\/\+(Page|Layout|Wrapper|Loading)(\.[^/]*)?\.(mdx?|[cm]?[jt]sx?)$/.test(getFile(id));
}

export function getFile(id: string): string {
  return id.split("?")[0]!;
}
