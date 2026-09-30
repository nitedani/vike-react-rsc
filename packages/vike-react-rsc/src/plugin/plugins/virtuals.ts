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

// plugin-rsc rewrites these literal calls for dev and build. Name the SSR entry
// explicitly: its first-input fallback selects Universal Deploy's node entry.
const loadRscRuntime = `export default await import.meta.viteRsc.loadModule("rsc", "index");`;
const loadSsrRuntime = `export default await import.meta.viteRsc.loadModule("ssr", "ssr");`;

export const virtuals: Plugin[] = [
  createVirtualPlugin("build-rsc-entry", () => importRsc),
  createVirtualPlugin("build-ssr-entry", () => importSsr),
  createVirtualPlugin("runtime/ssr", function () {
    return this.environment.name === "ssr" ? importSsr : loadSsrRuntime;
  }),
  createVirtualPlugin("runtime/server", function () {
    return this.environment.name === "rsc" ? importRsc : loadRscRuntime;
  }),
];
