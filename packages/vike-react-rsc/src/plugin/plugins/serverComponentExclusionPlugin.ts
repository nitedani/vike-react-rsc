import { hasDirective } from "@hiogawa/transforms";
import path from "path";
import { parseAstAsync, type Plugin } from "vite";
import { createDependencyManager } from "../../runtime/dependencyManager";

// Regular expression to identify CSS files
const styleFileRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/;

// Global state is accessed via global.vikeReactRscGlobalState

/**
 * Plugin to exclude server components from client and SSR bundles
 * while preserving CSS imports for proper styling.
 */
export const serverComponentExclusionPlugin = (): Plugin[] => {
  // Debug mode
  const debug = true;

  // Create universal dependency manager with options
  const dependencyManager = createDependencyManager({
    styleFileRE,
    debug,
    clientReferences: global.vikeReactRscGlobalState.clientReferences,
  });

  return [
    // Use the dependency collector and graph builder plugins
    dependencyManager.collectorPlugin,
    dependencyManager.graphBuilderPlugin,
    {
      name: "vike-rsc:server-component-exclusion",
      apply: "build",
      applyToEnvironment(environment) {
        return environment.name === "client";
      },
      configureServer(server) {
        // Update the dependency manager with the dev server
        dependencyManager.devServer = server;
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

          // Get client and server references
          const clientRefs = global.vikeReactRscGlobalState?.clientReferences || {};
          const serverRefs = global.vikeReactRscGlobalState?.serverReferences || {};

          const boundaries = [
            // In build mode these are guaranteed to exist here
            // They are created by the first two rsc builds
            // And now we are in the client build, followed by the rsc builds
            ...Object.values(clientRefs),
            ...Object.values(serverRefs),
          ];

          // If our id is either a "use client" or "use server" file
          // We don't want to strip those, they are already transformed by the other plugins
          if (boundaries.includes(id)) {
            return null;
          }

          // If this module is a dependency of a client reference, don't strip it
          if (dependencyManager.isClientDependency(id)) {
            if (debug) {
              console.log(`[RSC Plugin] Preserving client dependency in client bundle: ${relPath}`);
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
              console.log(`[RSC Plugin] ${relPath} has use client/server directive, preserving in client bundle`);
            }
            return null;
          }

          // Get CSS dependencies using the universal dependency manager
          const cssIds = dependencyManager.getCssDependencies(id);

          // Log only when CSS dependencies are found
          if (debug && cssIds.length > 0) {
            console.log(`[RSC Plugin] Found ${cssIds.length} CSS dependencies for ${id}`);
          }

          // Create a minimal proxy module
          let proxyCode = "";

          // Add CSS imports
          if (cssIds.length > 0) {
            proxyCode +=
              cssIds.map((cssPath) => `import "${cssPath}";`).join("\n") + "\n";
          }

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
