import { getVikeConfig } from "vike/plugin";
import type { Plugin } from "vite";
import { getDirectives, isComponentFile, parse } from "./parse";

/** Under `components: 'client'`, an unmarked .jsx or .tsx file is a client component, and `"use server component"` marks
 * a server component */
export function clientDefault(): Plugin {
  return {
    name: "vike-react-rsc:client-default",
    // The code as the user wrote it, before plugin-rsc reads its directives
    enforce: "pre",
    async transform(code, id) {
      if (this.environment.name !== "rsc" || !isComponentFile(id) || !isClientDefault()) return;
      if (getDirectives(await parse(code, id)).length > 0) return;
      // On the first line, so the source map stays valid
      return { code: `"use client";${code}`, map: null };
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
