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

/** A module that isn't being transformed, e.g. one the module being transformed imports */
export async function readProgram(id: string): Promise<ESTree.Program> {
  return parse(await readFile(getFile(id), "utf8"), id);
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

type Binding = { source: string; imported: string; exported?: string };

/** The bindings the module imports or re-exports, except types: `imported` is its name in `source` ("*" for all of
 * them), `exported` the name the module re-exports it under ("*" for `export * from`) */
export function getBindings(program: ESTree.Program): Binding[] {
  const imports = new Map<string, Binding>();
  const bindings: Binding[] = [];
  for (const statement of program.body) {
    if (statement.type === "ImportDeclaration" && statement.importKind !== "type") {
      for (const specifier of statement.specifiers) {
        const imported =
          specifier.type === "ImportSpecifier" ? getName(specifier.imported) : specifier.type === "ImportDefaultSpecifier" ? "default" : "*";
        const binding = { source: String(statement.source.value), imported };
        imports.set(specifier.local.name, binding);
        bindings.push(binding);
      }
    }
    if (statement.type === "ExportAllDeclaration" && statement.exportKind !== "type") {
      bindings.push({ source: String(statement.source.value), imported: "*", exported: statement.exported ? getName(statement.exported) : "*" });
    }
    if (statement.type === "ExportNamedDeclaration" && statement.exportKind !== "type") {
      for (const specifier of statement.specifiers) {
        const local = getName(specifier.local);
        const binding = statement.source ? { source: String(statement.source.value), imported: local } : imports.get(local);
        if (binding) bindings.push({ ...binding, exported: getName(specifier.exported) });
      }
    }
  }
  return bindings;
}

/** The names the module exports, except through `export * from` */
export function getExportNames(program: ESTree.Program): string[] {
  return program.body.flatMap((statement) => {
    if (statement.type === "ExportDefaultDeclaration") return ["default"];
    if (statement.type !== "ExportNamedDeclaration") return [];
    const { declaration } = statement;
    if (!declaration) return statement.specifiers.map((specifier) => getName(specifier.exported));
    if (declaration.type === "VariableDeclaration") return declaration.declarations.flatMap(({ id }) => (id.type === "Identifier" ? [id.name] : []));
    return "id" in declaration && declaration.id?.type === "Identifier" ? [declaration.id.name] : [];
  });
}

function getName(name: ESTree.ModuleExportName): string {
  return name.type === "Literal" ? String(name.value) : name.name;
}

/** A JavaScript or TypeScript module of the app, not of a package */
export function isAppFile(id: string): boolean {
  const file = getFile(id);
  return !id.startsWith("\0") && path.extname(file) in langs && !file.includes("/node_modules/");
}

/** A .jsx or .tsx file of the app, and the + file of a Page, Layout or Wrapper in any language, but no other + file, e.g.
 * +Loading.jsx */
export function isComponentFile(id: string): boolean {
  const file = getFile(id);
  return isAppFile(id) && (path.basename(file).startsWith("+") ? isPlusComponentFile(id) : /\.[jt]sx$/.test(file));
}

/** The + file of a Page, Layout or Wrapper */
export function isPlusComponentFile(id: string): boolean {
  return /\/\+(Page|Layout|Wrapper)(\.[^/]*)?\.[cm]?[jt]sx?$/.test(getFile(id));
}

export function getFile(id: string): string {
  return id.split("?")[0]!;
}
