import { parseAstAsync, type Plugin, type ViteDevServer } from "vite";
import path from "path";
import {
  retrieveAssetsDev,
  styleFileRE,
} from "../../runtime/retrieveAssetsDev";
import { retrieveAssetsProd, buildCssDependencyGraph } from "../../runtime/retrieveAssetsProd";
import { hasDirective } from "@hiogawa/transforms";

// Define styleFileRE here to match CSS file extensions

/**
 * Plugin to exclude server components from client and SSR bundles
 * while preserving CSS imports for proper styling.
 */
export const serverComponentExclusionPlugin = (): Plugin[] => {
  let devServer: ViteDevServer;
  // Store direct CSS imports for each module
  const cssImportMapBuild: { [importer: string]: string[] } = {};
  // Store JavaScript module dependencies
  const jsImportMapBuild: { [importer: string]: string[] } = {};
  // Store the complete CSS dependency graph
  let cssImportGraph: { [importer: string]: Set<string> } = {};
  // Store original source paths for resolved IDs
  const originalSourceMap: { [resolvedId: string]: string } = {};

  return [
    {
      name: "vike-rsc:discover-css-build2",
      apply: "build",
      enforce: "pre",
      applyToEnvironment(environment) {
        return environment.name === "rsc";
      },
      resolveId: {
        order: "pre",
        async handler(source, importer, options) {
          if (!importer) return;

          // Skip virtual modules and node_modules
          if (source.includes('\0') || source.includes('node_modules')) return;

          try {
            // Try to resolve the source to get the full path
            const resolved = await this.resolve(source, importer, { skipSelf: true, ...options });
            if (!resolved) return;

            const resolvedId = resolved.id;

            // Store the original source path for this resolved ID
            originalSourceMap[resolvedId] = source;

            if (styleFileRE.test(resolvedId)) {
              // Record direct CSS imports
              cssImportMapBuild[importer] ??= [];
              cssImportMapBuild[importer].push(resolvedId);
            } else if (
              resolvedId.endsWith('.js') || resolvedId.endsWith('.jsx') ||
              resolvedId.endsWith('.ts') || resolvedId.endsWith('.tsx') ||
              resolvedId.endsWith('.mjs') || resolvedId.endsWith('.cjs')
            ) {
              // Record JavaScript module dependencies
              jsImportMapBuild[importer] ??= [];
              jsImportMapBuild[importer].push(resolvedId);
            }
          } catch (error) {
            // Silently ignore resolution errors
          }
        },
      },
      // Build the complete CSS dependency graph after all modules are processed
      buildEnd() {
        // Build the complete CSS dependency graph using the utility function
        cssImportGraph = buildCssDependencyGraph(cssImportMapBuild, jsImportMapBuild);
      },
    },
    {
      name: "vike-rsc:server-component-exclusion",
      // enforce: "pre", // Run before other plugins

      applyToEnvironment(environment) {
        return environment.name === "client";
      },
      configureServer(server) {
        devServer = server;
      },
      async transform(code, id: string) {
        // Only apply to client and SSR environments
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

          if (devServer) {
            try {
              // Try to load the module fully in the rsc env in development
              const mod = await devServer?.environments.rsc.transformRequest(
                id
              );
              const deps = new Set(mod?.deps ?? []);
              for (const dep of deps) {
                const mod = await devServer?.environments.rsc.transformRequest(
                  dep
                );
                for (const element of mod?.deps ?? []) {
                  deps.add(element);
                }
              }
            } catch (e) {}
          }

          const boundaries = [
            // In build mode these are guaranteed to exist here
            // They are crated by the first two rsc builds
            // And now we are in the client build, followed by the rsc builds
            ...Object.values(global.vikeReactRscGlobalState.clientReferences),
            ...Object.values(global.vikeReactRscGlobalState.serverReferences),
          ];

          // If our id is either a "use client" or "use server" file
          // We don't want to strip those, they are already transformed by the other plugins
          if (boundaries.includes(id)) {
            return null;
          }

          // let's also check if it has a "use client" or "use server" directive,
          // this is needed for files that aren't part of the rsc modulegraph
          // for example Vike config files, etc..
          const ast = await parseAstAsync(code);
          if (
            hasDirective(ast.body, "use client") ||
            hasDirective(ast.body, "use server")
          ) {
            return null;
          }

          let cssIds: string[] = [];
          if (devServer) {
            // At this point we should have all the css imports
            cssIds = await retrieveAssetsDev(
              [id],
              global.vikeReactRscGlobalState.devServer!.environments.rsc
                .moduleGraph
            );
          } else {
            // Use retrieveAssetsProd to get properly formatted CSS paths
            cssIds = retrieveAssetsProd(
              id,
              cssImportGraph,
              originalSourceMap
            );

            // Log only when CSS dependencies are found
            if (cssIds.length > 0) {
              console.log(`[RSC Plugin] Found ${cssIds.length} CSS dependencies for ${id}`);
            }
          }

          // Create a minimal proxy module
          let proxyCode = "";

          // Add CSS imports
          if (cssIds.length > 0) {
            proxyCode +=
              cssIds.map((cssPath) => `import "${cssPath}";`).join("\n") + "\n";
          }

          console.log(cssIds);


          // Add empty exports to satisfy imports
          proxyCode += `
// Server component asset proxy (original code excluded from client bundle)
// Original file: ${id}
export default {};
export {};
`;

          console.log(
            `[RSC Plugin] Excluded server component from client bundle: ${relPath}, css: ${cssIds.length}`
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
  ];
};
