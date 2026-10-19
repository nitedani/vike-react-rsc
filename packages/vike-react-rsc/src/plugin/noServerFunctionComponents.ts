import { readFile } from "node:fs/promises";
import path from "node:path";
import { Visitor, type ESTree, type Plugin } from "vite";
import { isClientDefault } from "./clientDefault";
import { getDirectives, getFile, getImports, isAppFile, isPlusComponentFile, parse, type Directive } from "./parse";

type Module = { code: string; directives: Directive[]; imports: Map<string, string>; renderedNames: Set<string> };

/** `"use server"` makes every export a server function that any browser can call, e.g. past the page's guard(): a
 * component marked so by mistake fails the build */
export function noServerFunctionComponents(): Plugin {
  // By file, for both envs and every file that renders its exports
  const modules = new Map<string, Promise<Module>>();
  const getModule = async (file: string, code?: string): Promise<Module> => {
    const cached = modules.get(file);
    if (cached && (code === undefined || (await cached).code === code)) return cached;
    const module = readModule(file, code);
    modules.set(file, module);
    return module;
  };
  return {
    name: "vike-react-rsc:no-server-function-components",
    enforce: "pre",
    async transform(code, id) {
      if (!isAppFile(id) || this.environment.name === "ssr") return;
      const file = getFile(id);
      const { directives, imports, renderedNames } = await getModule(file, code);
      const root = this.environment.config.root;
      if (isPlusComponentFile(id) && directives.includes("use server")) {
        this.error(serverFunctionError(path.relative(root, file)));
      }
      for (const name of renderedNames) {
        const source = imports.get(name);
        const resolved = source && (await this.resolve(source, id));
        if (!resolved || !isAppFile(resolved.id)) continue;
        if ((await getModule(getFile(resolved.id))).directives.includes("use server")) {
          this.error(`${path.relative(root, file)} renders ${name}, but ${serverFunctionError(path.relative(root, getFile(resolved.id)))}`);
        }
      }
    },
    watchChange(id) {
      modules.delete(getFile(id));
    },
  };
}

async function readModule(file: string, code?: string): Promise<Module> {
  code ??= await readFile(file, "utf8");
  const program = await parse(code, file);
  return { code, directives: getDirectives(program), imports: getImports(program), renderedNames: getRenderedNames(program) };
}

function serverFunctionError(file: string): string {
  const fix = isClientDefault() ? `start it with "use server component" instead` : `remove "use server"`;
  return `${file} starts with "use server", which makes its exports server functions that any browser can call, not components: ${fix}`;
}

// The local names used as a JSX tag (`<Markdown />`, `<ui.Markdown />`) or as createElement()'s first argument
function getRenderedNames(program: ESTree.Program): Set<string> {
  const names = new Set<string>();
  const add = (node: ESTree.Node | undefined) => {
    if (node?.type === "JSXIdentifier" || node?.type === "Identifier") names.add(node.name);
    if (node?.type === "JSXMemberExpression" || node?.type === "MemberExpression") add(node.object as ESTree.Node);
  };
  new Visitor({
    JSXOpeningElement: (node) => add(node.name as ESTree.Node),
    CallExpression: (node) => {
      const { callee } = node;
      const name = callee.type === "MemberExpression" ? callee.property : callee;
      if (name.type === "Identifier" && name.name === "createElement") add(node.arguments[0] as ESTree.Node);
    },
  }).visit(program);
  return names;
}
