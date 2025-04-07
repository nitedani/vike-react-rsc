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
import {
  retrieveAssetsDev,
  styleFileRE,
} from "../../runtime/retrieveAssetsDev";

export const useServerPlugin = (): Plugin[] => {
  let buildMode = false;
  let resolvedConfig: ResolvedConfig;
  let devServer: ViteDevServer;
  const cssImportMapBuild: { [importer: string]: string[] } = {};
  return [
    {
      name: "vike-rsc:discover-css-build",
      apply: "build",
      enforce: "pre",
      applyToEnvironment(environment) {
        return environment.name === "rsc";
      },
      resolveId: {
        order: "pre",
        handler(source, importer) {
          if (styleFileRE.test(source) && importer) {
            cssImportMapBuild[importer] ??= [];
            cssImportMapBuild[importer].push(source);
          }
        },
      },
    },
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
          const ast = await parseAstAsync(code);
          const normalizedId = await normalizeReferenceId(
            id,
            "rsc",
            devServer,
            resolvedConfig
          );

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

            if (!output) return;

            global.vikeReactRscGlobalState.serverReferences[normalizedId] = id;

            if (devServer) {
              await devServer?.environments.rsc.warmupRequest(id);
              const cssIds = await retrieveAssetsDev(
                [
                  ...Object.keys(
                    global.vikeReactRscGlobalState.serverReferences
                  ),
                ],
                global.vikeReactRscGlobalState.devServer!.environments.rsc
                  .moduleGraph
              );
              for (const id of cssIds) {
                // bridge the gap between client > server reference
                // css will be picked up by Vike's own retrieveAssetsDev
                output.prepend(`import "${id}";`);
              }
            } else if (this.environment.name === "client") {
              // how do we "bridge the gap" so that the client actually imports the css imported by the server?
              // we should have knowledge of the imported css by the rsc envirnonment build at this point
              // and then just prepend it to the client code here
              // Vike will discover it on build
              for (const cssId of cssImportMapBuild[id] ?? []) {
                output.prepend(`import "${cssId}";`);
              }
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
      if (this.environment.name !== "rsc" || this.environment?.mode !== "build")
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
