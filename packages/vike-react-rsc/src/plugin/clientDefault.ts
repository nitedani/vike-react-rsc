import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { Visitor, type ESTree, type Plugin } from "vite";
import { getDirectives, getFile, getImports, isAppFile, isComponentFile, parse, readDirectives } from "./parse";

/** Under `components: 'client'`, an unmarked .jsx or .tsx file is a client component, and `"use server component"` marks
 * a server component */
export function clientDefault(): Plugin {
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      if (this.environment.name !== "rsc" || !isAppFile(id) || !isClientDefault()) return;
      const program = await parse(code, id);
      const directives = getDirectives(program);
      if (directives.includes("use client")) return;
      // On the first line, so the source map stays valid
      if (isComponentFile(id) && directives.length === 0) return { code: `"use client";${code}`, map: null };

      // Server code: what it imports from a client component file is a client reference, which throws when called
      const root = this.environment.config.root;
      const imports = getImports(program);
      for (const [name, call] of getCalls(program)) {
        const source = imports.get(name);
        const resolved = source && (await this.resolve(source, id));
        if (!resolved || !isComponentFile(resolved.id) || (await readDirectives(resolved.id)).length > 0) continue;
        const from = path.relative(root, getFile(resolved.id));
        const fix = /^use[A-Z]/.test(call)
          ? `a hook runs only in a client component`
          : `move it to a .js or .ts file, or start ${from} with "use server component"`;
        this.error(`${path.relative(root, getFile(id))} calls ${call}() from ${from}, which is a client component file, so it can't run on the server: ${fix}`);
      }
    },
  };
}

export function isClientDefault(): boolean {
  // One module is one component in the rsc env, so all pages have the same default
  const values = new Set(Object.values(getVikeConfig().pages).map((page) => page.config.components));
  if (values.size > 1) {
    throw new Error(`[vike-react-rsc] Set components once, in the root +config.js: pages set it to ${[...values].join(" and ")}`);
  }
  return values.has("client");
}

// The functions the module calls, by the local name they're called through: `badge` for `badge()` and `ui` for `ui.badge()`
function getCalls(program: ESTree.Program): Map<string, string> {
  const calls = new Map<string, string>();
  new Visitor({
    CallExpression: ({ callee }) => {
      if (callee.type === "Identifier") calls.set(callee.name, callee.name);
      if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.property.type === "Identifier") {
        calls.set(callee.object.name, `${callee.object.name}.${callee.property.name}`);
      }
    },
  }).visit(program);
  return calls;
}
