import type { Plugin } from "vite";
import { createVirtualPlugin } from "../utils";
import { PKG_NAME } from "../../constants";

const importRsc = `
              import * as serverModule from "${PKG_NAME}/__internal/runtime/server";
              export * from "${PKG_NAME}/__internal/runtime/server";
              export default serverModule;
            `;
const importSsr = `
              import * as ssrModule from "${PKG_NAME}/__internal/runtime/ssr";
              export * from "${PKG_NAME}/__internal/runtime/ssr";
              export default ssrModule;
            `;

// plugin-rsc rewrites loadModule() to a runner import in dev and to a relative
// import() of the target environment's entry chunk in build, so both the dev proxy
// and the build-time path rewriting are its concern rather than ours.
//
// The entry name is passed explicitly for ssr: loadModule() otherwise falls back to
// the environment's first rollup input, which for ssr is Universal Deploy's `index`
// node entry, not our ssr runtime. Both arguments must stay literals — plugin-rsc
// evaluates them statically from the source text.
const loadRscRuntime = `export default await import.meta.viteRsc.loadModule("rsc", "index");`;
const loadSsrRuntime = `export default await import.meta.viteRsc.loadModule("ssr", "ssr");`;

export const virtuals: Plugin[] = [
  createVirtualPlugin("environment-name", function () {
    return `export default "${this.environment.name}"`;
  }),
  createVirtualPlugin("build-rsc-entry", () => importRsc),
  createVirtualPlugin("build-ssr-entry", () => importSsr),
  createVirtualPlugin("runtime/ssr", function () {
    return this.environment.name === "ssr" ? importSsr : loadSsrRuntime;
  }),
  createVirtualPlugin("runtime/server", function () {
    return this.environment.name === "rsc" ? importRsc : loadRscRuntime;
  }),
];
