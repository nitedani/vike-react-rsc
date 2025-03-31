import type { Plugin } from "vite";
import { createVirtualPlugin } from "../utils";
import { PKG_NAME } from "../../constants";

export const virtuals: Plugin[] = [
  createVirtualPlugin("enviroment-name", function () {
    return `export default "${this.environment.name}"`;
  }),
  createVirtualPlugin(
    "build-rsc-entry",
    () => `
              import * as serverModule from "vike-react-rsc/__internal/runtime/server";
              export * from "vike-react-rsc/__internal/runtime/server";
              export default serverModule;
            `
  ),
  createVirtualPlugin("runtime/server", function () {
    if (this.environment.name !== "ssr") {
      return "export default {}";
    }
    if (this.environment.mode === "dev") {
      return `
            const devServer = global.vikeReactRscGlobalState.devServer;
            const rscRunner = devServer?.environments.rsc?.runner;
            const serverModule = await rscRunner?.import("${PKG_NAME}/__internal/runtime/server");
            const moduleProxy = new Proxy({}, {
              get(target, prop) {
                return serverModule[prop];
              }
            });
            export default moduleProxy;
            `;
    }

    return `
          import * as serverModule from "virtual:dist-importer";
          export * from "virtual:dist-importer";
          export default serverModule;
        `;
  }),
  {
    name: "virtual:dist-importer",
    resolveId(source) {
      if (source === "virtual:dist-importer") {
        return { id: "__VIRTUAL_BUILD_RSC_ENTRY__", external: true };
      }
      return;
    },
    renderChunk(code, chunk) {
      if (code.includes("__VIRTUAL_BUILD_RSC_ENTRY__")) {
        //TODO: make this reliable
        const replacement = "../../rsc/index.mjs";
        code = code.replace("__VIRTUAL_BUILD_RSC_ENTRY__", replacement);
        return { code };
      }
      return;
    },
  },
];
