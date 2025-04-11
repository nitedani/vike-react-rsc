import {
  transformDirectiveProxyExport,
  transformServerActionServer,
} from "@hiogawa/transforms";
import {
  parseAstAsync,
  type Plugin,
  type ResolvedConfig,
  type ViteDevServer,
} from "vite";
import { PKG_NAME } from "../../constants";
import { createVirtualPlugin, normalizeReferenceId } from "../utils";

export const useServerPlugin = (): Plugin[] => {
  let resolvedConfig: ResolvedConfig;
  let devServer: ViteDevServer;

  return [
    {
      name: "vike-rsc:transform-server-directive",
      configResolved(config) {
        resolvedConfig = config;
        // Command is build or serve
      },
      configureServer(server) {
        devServer = server;
      },
      async transform(code, id) {
        if (id.includes("/.vite/")) return;
        if (!code.includes("use server")) return;
        try {
          const ast = await parseAstAsync(code);
          const normalizedId = await normalizeReferenceId(
            id,
            "ssr",
            devServer,
            resolvedConfig
          );

          if (this.environment.name === "ssr") {
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

            if (!output) return;

            global.vikeReactRscGlobalState.serverReferences[normalizedId] = id;

            await devServer?.environments.ssr.warmupRequest(id);
            for (const cssId of global.vikeReactRscGlobalState.getCssDependencies(
              id
            )) {
              output.prepend(`import "${cssId}";`);
            }

            const name = this.environment.name === "client" ? "browser" : "ssr";
            output.prepend(`
              import { createServerReference } from "${PKG_NAME}/__internal/register/${name}";
              const $$proxy = (id, name) => {
                  const r = createServerReference(${JSON.stringify(
                    normalizedId
                  )} + "#" + name, (...args) =>{ "${normalizedId}"; return __vikeRscCallServer(...args)})
                  Object.defineProperty(r, "name", { value: ${JSON.stringify(
                    normalizedId
                  )}});
                  return r;
              }
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
      if (this.environment.name !== "ssr" || this.environment?.mode !== "build")
        return "export default {};";

      return [
        `export default {`,
        ...Object.entries(global.vikeReactRscGlobalState.serverReferences).map(
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
