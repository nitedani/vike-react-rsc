import type { Plugin } from "vite";
import { isAppFile, parse } from "./parse";

const source = "vike-react-rsc/ClientOnly";

/** A server component's `<ClientOnly>` children go to the browser in its Flight, but Vike's +staticReplace strips them
 * in every server env. It matches the import path, so the rsc env imports ClientOnly by its resolved path. */
// TODO: remove once Vike's +staticReplace can leave out the rsc env (https://github.com/vikejs/vike/pull/3635)
export function keepClientOnlyChildren(): Plugin {
  return {
    name: "vike-react-rsc:keep-client-only-children",
    enforce: "pre",
    applyToEnvironment: (environment) => environment.name === "rsc",
    async transform(code, id) {
      if (!isAppFile(id) || !code.includes(source)) return;
      const resolved = JSON.stringify((await this.resolve(source, id))!.id);
      // From the last statement, so the offsets of the ones before stay valid
      for (const statement of (await parse(code, id)).body.reverse()) {
        if (statement.type === "ImportDeclaration" && statement.source.value === source) {
          code = code.slice(0, statement.source.start) + resolved + code.slice(statement.source.end);
        }
      }
      return { code, map: null };
    },
  };
}
