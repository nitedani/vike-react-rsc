import { parseAstAsync, type Plugin } from "vite";
import path from "path";
import { hasDirective } from "@hiogawa/transforms";
import { createCssDependencyTracker } from "./cssDependencyTracker";
import { createClientDependencyTracker } from "./clientDependencyTracker";

// Regular expression to identify CSS files
const styleFileRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/;

/**
 * Plugin to exclude server components from client and SSR bundles
 * while preserving CSS imports for proper styling.
 */
export const serverComponentExclusionPlugin = (): Plugin[] => {
  // Debug mode
  const debug = true;

  // Create CSS dependency tracker
  const cssDependencyTracker = createCssDependencyTracker({
    styleFileRE,
    debug,
    environmentName: "rsc",
  });

  // Create client dependency tracker
  const clientDependencyTracker = createClientDependencyTracker({
    debug,
    environmentName: "rsc",
    clientReferences: global.vikeReactRscGlobalState?.clientReferences || {},
  });

  // Log initialization
  if (debug) {
    console.log("[RSC Plugin] Initialized dependency trackers");
  }

  return [
    // Use the CSS dependency tracker plugins
    cssDependencyTracker.collectorPlugin,
    cssDependencyTracker.graphBuilderPlugin,
    // Use the client dependency tracker plugins
    clientDependencyTracker.collectorPlugin,
    clientDependencyTracker.graphBuilderPlugin,
    {
      name: "vike-rsc:server-component-exclusion",
      apply: "build", // Only apply during build
      // enforce: "pre", // Run before other plugins

      applyToEnvironment(environment) {
        return environment.name === "client";
      },
      // Build mode only - no configureServer needed
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

          // Build mode only - no development mode code needed

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
          if (clientDependencyTracker.isClientDependency(id)) {
            if (debug) {
              console.log(
                `[RSC Plugin] Preserving client dependency in client bundle: ${relPath}`
              );
            }
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

          // Get CSS dependencies using the CSS dependency tracker
          const cssIds = cssDependencyTracker.getCssDependencies(id);

          // Log only when CSS dependencies are found
          if (cssIds.length > 0 && debug) {
            console.log(
              `[RSC Plugin] Found ${cssIds.length} CSS dependencies for ${id}`
            );
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
