import path from "node:path";
import { Visitor, type ESTree, type Plugin } from "vite";
import { isClientDefault } from "./clientDefault";
import { getDirectives, getFile, getImports, isAppFile, isPlusComponentFile, parse, readDirectives } from "./parse";

/** `"use server"` makes every export a server function that any browser can call, e.g. past the page's guard(): a
 * component marked so by mistake fails the build */
export function noServerFunctionComponents(): Plugin {
  return {
    name: "vike-react-rsc:no-server-function-components",
    enforce: "pre",
    async transform(code, id) {
      if (!isAppFile(id) || this.environment.name === "ssr") return;
      const program = await parse(code, id);
      const file = getFile(id);
      const root = this.environment.config.root;
      if (isPlusComponentFile(id) && getDirectives(program).includes("use server")) {
        this.error(serverFunctionError(path.relative(root, file)));
      }
      const imports = getImports(program);
      for (const name of getRenderedNames(program)) {
        const source = imports.get(name);
        const resolved = source && (await this.resolve(source, id));
        if (!resolved || !isAppFile(resolved.id)) continue;
        if ((await readDirectives(resolved.id)).includes("use server")) {
          this.error(`${path.relative(root, file)} renders ${name}, but ${serverFunctionError(path.relative(root, getFile(resolved.id)))}`);
        }
      }
    },
  };
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
