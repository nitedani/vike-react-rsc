import type { Plugin } from "vite";
import { createVirtualPlugin } from "../utils";
import { PKG_NAME } from "../../constants";
import path from "path";

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

export const virtuals: Plugin[] = [
  createVirtualPlugin("enviroment-name", function () {
    return `export default "${this.environment.name}"`;
  }),
  createVirtualPlugin("build-rsc-entry", () => importRsc),
  createVirtualPlugin("build-ssr-entry", () => importSsr),
  createVirtualPlugin("runtime/ssr", function () {
    if (this.environment.name === "ssr") {
      return importSsr;
    }

    if (this.environment.mode === "dev") {
      return `
            const devServer = global.vikeReactRscGlobalState.devServer;
            const ssrRunner = devServer?.environments.ssr?.runner;
            const ssrModule = await ssrRunner?.import("${PKG_NAME}/__internal/runtime/ssr");
            const moduleProxy = new Proxy({}, {
              get(target, prop) {
                return ssrModule[prop];
              }
            });
            export default moduleProxy;
            `;
    }

    return `
          import * as ssrModule from "virtual:dist-importer?server";
          export * from "virtual:dist-importer?server";
          export default ssrModule;
        `;
  }),
  createVirtualPlugin("runtime/server", function () {
    if (this.environment.name === "rsc") {
      return importRsc;
    }

    if (this.environment.mode === "dev") {
      return `
            const devServer = global.vikeReactRscGlobalState.devServer;
            const serverRunner = devServer?.environments.rsc?.runner;
            const serverModule = await serverRunner?.import("${PKG_NAME}/__internal/runtime/server");
            const moduleProxy = new Proxy({}, {
              get(target, prop) {
                return serverModule[prop];
              }
            });
            export default moduleProxy;
            `;
    }

    return `
          import * as serverModule from "virtual:dist-importer?rsc";
          export * from "virtual:dist-importer?rsc";
          export default serverModule;
        `;
  }),
  {
    name: "virtual:dist-importer",
    resolveId(source) {
      if (source.includes("virtual:dist-importer")) {
        return {
          id: `__VIRTUAL_BUILD_ENTRY__?${source.split("?")[1]}`,
          external: true,
        };
      }
      return;
    },
    renderChunk(code, chunk) {
      if (code.includes("__VIRTUAL_BUILD_ENTRY__")) {
        const importerPath = path.join(
          this.environment.config.build.outDir,
          chunk.fileName
        );

        code = code
          .replaceAll(
            "__VIRTUAL_BUILD_ENTRY__?server",
            path.relative(path.dirname(importerPath), "dist/server/ssr.mjs")
          )
          .replaceAll(
            "__VIRTUAL_BUILD_ENTRY__?rsc",
            path.relative(path.dirname(importerPath), "dist/rsc/index.mjs")
          );

        return { code };
      }
      return;
    },
  },
];
