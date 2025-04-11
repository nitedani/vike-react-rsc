import { transformDirectiveProxyExport } from "@hiogawa/transforms";
// No additional imports needed
import {
  parseAstAsync,
  type Plugin,
  type ResolvedConfig,
  type ViteDevServer,
} from "vite";
import { PKG_NAME } from "../../constants";
import { createVirtualPlugin, normalizeReferenceId } from "../utils";

export const useClientPlugin = (): Plugin[] => {
  let resolvedConfig: ResolvedConfig;
  let devServer: ViteDevServer;
  return [
    {
      name: "vike-rsc:transform-client-directive",
      configResolved(config) {
        resolvedConfig = config;
        // Command is build or serve
      },
      configureServer(server) {
        devServer = server;
      },
      async transform(code, id) {
        if (this.environment?.name !== "ssr") return;
        if (!code.includes("use client")) return;
        if (global.vikeReactRscGlobalState.disableUseClientPlugin) return;

        try {
          const ast = await parseAstAsync(code);
          const normalizedId = await normalizeReferenceId(
            id,
            "client",
            devServer,
            resolvedConfig
          );

          const output = await transformDirectiveProxyExport(ast, {
            directive: "use client",
            id: normalizedId,
            runtime: "$$register",
          });

          if (!output) return;

          global.vikeReactRscGlobalState.clientReferences[normalizedId] = id;

          output.prepend(`
                import { registerClientReference } from "${PKG_NAME}/__internal/register/server";
                const $$register = (id, name) => registerClientReference({}, id, name);
              `);

          return {
            code: output.toString(),
            map: { mappings: "" },
          };
        } catch (error) {
          console.error(
            `[RSC Plugin] Error transforming client directive in ${id}:`,
            error
          );
          return;
        }
      },
    },
    // Create a virtual module for client references
    createVirtualPlugin("client-references", function () {
      if (this.environment.name === "ssr" && this.environment?.mode !== "build")
        return "export default {};";

      return [
        `export default {`,
        ...Object.entries(global.vikeReactRscGlobalState.clientReferences).map(
          ([normalizedId, id]) =>
            `${JSON.stringify(normalizedId)}: () => import(${JSON.stringify(
              id
            )}),\n`
        ),
        `}`,
      ].join("\n");
    }),
  ];
};
