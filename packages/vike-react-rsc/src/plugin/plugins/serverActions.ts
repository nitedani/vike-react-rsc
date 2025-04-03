// src/plugin/plugins/serverActions.ts
import { transformDirectiveProxyExport, transformServerActionServer } from "@hiogawa/transforms";
import { hashString } from "@hiogawa/utils";
import path from "node:path";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { PKG_NAME } from "../../constants";
import { createVirtualPlugin, normalizeReferenceId } from "../utils";

export const serverActionsPlugin = (): Plugin[] => {
  let buildMode = false;
  let resolvedConfig: ResolvedConfig;
  let devServer: ViteDevServer;
  return [
    {
      name: "vike-rsc:transform-server-directive",
      configResolved(config) {
        resolvedConfig = config;
        buildMode = config.command === "build";
      },
      configureServer(server) {
        devServer = server;
      },
      async transform(code, id) {
        if (id.includes("/.vite/")) return;
        if (!code.includes("use server")) return;

        try {
          const ast = this.parse(code);
          let normalizedId;

          if (buildMode) {
            normalizedId = hashString(path.relative(resolvedConfig.root, id));
          } else {
            normalizedId = await normalizeReferenceId(
              id,
              "rsc",
              devServer,
              resolvedConfig
            );
          }

          if (this.environment.name === "rsc") {
            // Server-side transformation
            const { output } = await transformServerActionServer(code, ast, {
              id: normalizedId,
              runtime: "$$register",
            });
            
            if (!output.hasChanged()) return;

            global.vikeReactRscGlobalState.serverReferences[normalizedId] = id;
            
            output.prepend(`
              import { registerServerReference } from "${PKG_NAME}/__internal/register/server";
              const $$register = (value, id, name) => {
                if (typeof value !== 'function') return value;
                return registerServerReference(value, id, name);
              }
            `);
            
            return {
              code: output.toString(),
              map: output.generateMap({ hires: "boundary" }),
            };
          } else {
            // Client-side transformation 
            const output = await transformDirectiveProxyExport(ast, {
              id: normalizedId,
              runtime: "$$proxy",
              directive: "use server",
            });
            
            if (!output?.hasChanged()) return;
            
            global.vikeReactRscGlobalState.serverReferences[normalizedId] = id;
            
            const name = this.environment.name === "client" ? "browser" : "ssr";
            output.prepend(`
              import { createServerReference } from "${PKG_NAME}/__internal/register/${name}";
              const $$proxy = (id, name) => createServerReference(${JSON.stringify(normalizedId + "#" + name)}, (...args) => callServer(...args))
            `);
            
            return { code: output.toString(), map: { mappings: "" } };
          }
        } catch (error) {
          console.error(
            `[RSC Plugin] Error transforming server directive in ${id}:`,
            error
          );
          return;
        }
      },
    },
    // Virtual module for server references
    createVirtualPlugin("server-references", function () {
      if (this.environment.name !== "rsc" || this.environment?.mode !== "build")
        return "export default {};";

      return [
        `export default {`,
        ...Object.entries(global.vikeReactRscGlobalState.serverReferences || {}).map(
          ([normalizedId, id]) =>
            `${JSON.stringify(normalizedId)}: () => import(${JSON.stringify(id)}),\n`
        ),
        `}`,
      ].join("\n");
    }),
  ];
};