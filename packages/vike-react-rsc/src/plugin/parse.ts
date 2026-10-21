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

/** Each export of another module that a module imports or re-exports, by its source and name ("*" for all of them), and
 * each of its own exports: from such an import, or else its own code */
export function getBindings(program: ESTree.Program): { imports: Binding[]; exports: Map<string, Binding | undefined>; exportAll: string[] } {
  const imported = new Map<string, Binding>();
  const exports = new Map<string, Binding | undefined>();
  const exportAll: string[] = [];
  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue;
    for (const specifier of statement.specifiers) {
      const name = specifier.type === "ImportSpecifier" ? getName(specifier.imported) : specifier.type === "ImportDefaultSpecifier" ? "default" : "*";
      imported.set(specifier.local.name, { source: String(statement.source.value), name });
    }
  }
  for (const statement of program.body) {
    if (statement.type === "ExportAllDeclaration" && statement.exportKind !== "type") {
      const source = String(statement.source.value);
      if (statement.exported) exports.set(getName(statement.exported), { source, name: "*" });
      else exportAll.push(source);
    } else if (statement.type === "ExportNamedDeclaration" && statement.exportKind !== "type") {
      const { declaration, source } = statement;
      if ((declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration") && declaration.id) exports.set(declaration.id.name, undefined);
      if (declaration?.type === "VariableDeclaration") for (const { id } of declaration.declarations) if (id.type === "Identifier") exports.set(id.name, undefined);
      for (const { local, exported } of statement.specifiers) {
        exports.set(getName(exported), source ? { source: String(source.value), name: getName(local) } : imported.get(getName(local)));
      }
    } else if (statement.type === "ExportDefaultDeclaration") {
      const { declaration } = statement;
      exports.set("default", declaration.type === "Identifier" ? imported.get(declaration.name) : undefined);
    }
  }
  const reexports = [...exports.values()].flatMap((binding) => binding ?? []);
  return { imports: [...imported.values(), ...reexports, ...exportAll.map((source) => ({ source, name: "*" }))], exports, exportAll };
}

export type Binding = { source: string; name: string };

function getName(node: ESTree.ModuleExportName): string {
  return node.type === "Literal" ? node.value : node.name;
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

/** The file from the app's root, a package's in the app's node_modules, e.g. node_modules/my-package/Button.js */
export function getFileName(id: string, root: string): string {
  const file = getFile(id);
  return /^.*\/(node_modules\/.+)$/.exec(file)?.[1] ?? path.relative(root, file);
}

export function getFile(id: string): string {
  return id.split("?")[0]!;
}
