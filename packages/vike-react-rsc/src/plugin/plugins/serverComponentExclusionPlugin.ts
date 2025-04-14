import { hasDirective } from "@hiogawa/transforms";
import path from "path";
import {
  DevEnvironment,
  EnvironmentModuleNode,
  isCSSRequest,
  parseAstAsync,
  type Plugin,
  type ViteDevServer,
} from "vite";

// Regular expression to identify CSS files
const styleFileRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/;

/**
 * Plugin to exclude server components from client and SSR bundles
 * while preserving CSS imports for proper styling.
 */
export const serverComponentExclusionPlugin = (): Plugin[] => {
  const debug = true;
  let devServer: ViteDevServer;
  return [
    {
      name: "vike-rsc:server-component-exclusion",
      applyToEnvironment(environment) {
        return environment.name === "client";
      },
      configureServer(server) {
        devServer = server;
      },
      async transform(code, id: string) {
        if (this.environment?.name !== "client") {
          return null;
        }
        if (!code) return null;
        // Skip virtual modules, node_modules, CSS files, and non-JS/TS files
        if (
          id.includes("\0") ||
          id.includes("node_modules") ||
          styleFileRE.test(id) ||
          !/\.(jsx?|tsx?|mjs|cjs)($|\?)/.test(id)
        ) {
          return null;
        }

        try {
          const relPath = path.relative(this.environment.config.root, id);
          if (relPath.startsWith("..") || path.isAbsolute(relPath)) {
            return null;
          }

          const boundaries = [
            // In build mode these are guaranteed to exist here
            // They are created by the first two rsc builds
            // And now we are in the client build, followed by the rsc builds
            ...Object.values(global.vikeReactRscGlobalState.clientReferences),
            ...Object.values(global.vikeReactRscGlobalState.serverReferences),
          ];

          // If our id is either a "use client" or "use server" file
          // We don't want to strip those, they are already transformed by the other plugins
          if (boundaries.includes(id)) {
            return null;
          }

          // If this module is a dependency of a client reference, don't strip it
          if (global.vikeReactRscGlobalState.isClientDependency(id)) {
            if (debug) {
              console.log(
                `[RSC Plugin] Preserving client dependency in client bundle: ${relPath}`
              );
            }
            return null;
          }

          // Parse the AST to check for directives and imports
          const ast = await parseAstAsync(code);

          // Check if it has a "use client" or "use server" directive
          if (
            hasDirective(ast.body, "use client") ||
            hasDirective(ast.body, "use server")
          ) {
            if (debug) {
              console.log(
                `[RSC Plugin] ${relPath} has use client/server directive, preserving in client bundle`
              );
            }
            return null;
          }

          // Create a minimal proxy module
          let proxyCode = "";

          // Add empty exports to satisfy imports
          proxyCode += `
// Server component asset proxy (original code excluded from client bundle)
// Original file: ${id}
export default {};
export {};
${
  devServer
    ? 'import "virtual:css-proxy.css?id=' + encodeURIComponent(id) + '"'
    : 'import "virtual:css-proxy?id=' + encodeURIComponent(id) + '"'
}
if (import.meta.hot) {
        import.meta.hot.accept();
}
`;

          console.log(
            `[RSC Plugin] Excluded server component from client bundle: ${relPath}`
          );

          return {
            code: proxyCode,
            map: { mappings: "" },
          };
        } catch (error) {
          console.error(
            `[RSC Plugin] Error in server component exclusion for ${id}:`,
            error
          );
        }

        return null;
      },
    },
    {
      name: "vike-rsc:css-proxy",
      resolveId(source, importer, options) {
        if (source.startsWith("virtual:css-proxy")) {
          return "\0" + source;
        }
      },
      async load(id, options) {
        if (!id.includes("virtual:css-proxy")) {
          return;
        }
        // const decoded = decodeURIComponent(id);
        const parsedUrl = new URL(id);
        console.log(parsedUrl);

        const externalId = parsedUrl.searchParams.get("id")!;
        if (!devServer) {
          const res =
            global.vikeReactRscGlobalState.getCssDependencies(externalId);
          const cssIds = res.cssIds;
          // Log only when CSS dependencies are found
          if (debug && cssIds.length > 0) {
            console.log(
              `[RSC Plugin] Found ${cssIds.length} CSS dependencies for ${externalId}`
            );
          }
          if (cssIds.length > 0) {
            return (
              cssIds.map((cssPath) => `import "${cssPath}";`).join("\n") + "\n"
            );
          }
          return "export default {};";
        } else {
          try {
            console.log({ externalId });

            // Try to load the module fully in the rsc env in development
            // before getting its css assets
            // devServer?.environments.rsc.moduleGraph.invalidateModule(
            //   devServer?.environments.rsc.moduleGraph.getModuleById(externalId)!
            // );
            const mod = await devServer?.environments.rsc.transformRequest(
              externalId
            );
            const deps = new Set(mod?.deps ?? []);
            for (const dep of deps) {
              try {
                // devServer?.environments.rsc.moduleGraph.invalidateModule(
                //   devServer?.environments.rsc.moduleGraph.getModuleById(dep)!
                // );
                const mod = await devServer?.environments.rsc.transformRequest(
                  dep
                );
                for (const element of mod?.deps ?? []) {
                  deps.add(element);
                }
              } catch (error) {
                console.log(`[RSC Plugin] Failed to load ${dep} in rsc env`);
              }
            }
          } catch (e) {
            console.log(`[RSC Plugin] Failed to load ${externalId} in rsc env`);
          }
          // const res =
          //   global.vikeReactRscGlobalState.getCssDependencies(externalId);
          // const cssIds = res.cssIds;
          // // Log only when CSS dependencies are found
          // if (debug && cssIds.length > 0) {
          //   console.log(
          //     `[RSC Plugin] Found ${cssIds.length} CSS dependencies for ${externalId}`
          //   );
          // }
          // for (const [excludedChildModule, directImportedCss] of Object.entries(
          //   res.jsDirectImporterMap
          // )) {
          //   global.vikeReactRscGlobalState.excludedModuleMap[
          //     excludedChildModule
          //   ] = {
          //     root: externalId,
          //   };
          // }

          const cssIds = await collectStyleUrls(devServer.environments.rsc, {
            entries: [externalId],
          });

          const cssStrings = (await Promise.all(
            cssIds.map((id) =>
              devServer.environments.client
                .transformRequest(id + "?direct")
                .then((res) => res?.code)
            )
          ).then((res) => res.filter(Boolean))) as string[];

          return cssStrings.join("\n");
        }
      },
    },
  ];
};

async function collectStyleUrls(
  server: DevEnvironment,
  { entries }: { entries: string[] }
) {
  const visited = new Set<EnvironmentModuleNode>();

  async function traverse(url: string) {
    const [, id] = await server.moduleGraph.resolveUrl(url);
    const mod = server.moduleGraph.getModuleById(id);
    if (!mod || visited.has(mod)) {
      return;
    }
    visited.add(mod);
    await Promise.all(
      [...mod.importedModules].map((childMod) => traverse(childMod.url))
    );
  }

  // ensure import analysis is ready for top entries
  await Promise.all(entries.map((e) => server.transformRequest(e)));

  // traverse
  await Promise.all(entries.map((url) => traverse(url)));

  return [...visited].map((mod) => mod.url).filter((url) => isCSSRequest(url));
}
