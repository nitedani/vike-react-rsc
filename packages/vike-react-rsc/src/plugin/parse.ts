import { hasDirective } from "@vitejs/plugin-rsc/transforms";
import path from "node:path";
import { parseAstAsync, transformWithOxc, type ESTree, type ResolvedConfig } from "vite";

const langs = { ".js": "js", ".mjs": "js", ".cjs": "js", ".jsx": "jsx", ".ts": "ts", ".mts": "ts", ".cts": "ts", ".tsx": "tsx" } as const;
const directives = ["use client", "use server", "use server component"] as const;
export type Directive = (typeof directives)[number];

/** The module as the user wrote it, JSX and TypeScript included */
export function parse(code: string, id: string): Promise<ESTree.Program> {
  return parseAstAsync(code, { lang: langs[path.extname(getFile(id)) as keyof typeof langs] });
}

/** The module as Vite runs it: without the imports TypeScript drops, those only types use, unless the file's tsconfig keeps
 * them with verbatimModuleSyntax */
export async function parseCompiled(code: string, id: string, config: ResolvedConfig): Promise<ESTree.Program> {
  const file = getFile(id);
  const lang = langs[path.extname(file) as keyof typeof langs];
  if (lang !== "ts" && lang !== "tsx") return parse(code, id);
  const compiled = await transformWithOxc(code, file, { lang, jsx: "preserve", sourcemap: false }, undefined, config);
  return parseAstAsync(compiled.code, { lang: lang === "tsx" ? "jsx" : "js" });
}

/** The directives of the module's prologue that say where it runs */
export function getDirectives(program: ESTree.Program): Directive[] {
  return directives.filter((directive) => hasDirective(program.body, directive));
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

/** Each module that a module as `parseCompiled()` gives it imports or re-exports statically */
export function getImportSources(program: ESTree.Program): string[] {
  return program.body.flatMap((statement) => {
    const isImport = statement.type === "ImportDeclaration" || statement.type === "ExportNamedDeclaration" || statement.type === "ExportAllDeclaration";
    return isImport && statement.source ? [String(statement.source.value)] : [];
  });
}

/** A JavaScript or TypeScript module of the app, not of a package */
export function isAppFile(id: string): boolean {
  return isModuleFile(id) && !getFile(id).includes("/node_modules/");
}

/** A JavaScript or TypeScript module, of the app or of a package */
export function isModuleFile(id: string): boolean {
  return !id.startsWith("\0") && path.extname(getFile(id)) in langs;
}

export function getFile(id: string): string {
  return id.split("?")[0]!;
}
