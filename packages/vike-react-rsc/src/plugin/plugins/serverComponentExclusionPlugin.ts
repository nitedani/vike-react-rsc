import { type Plugin, type ViteDevServer } from "vite";
import path from "path";
import { retrieveAssetsDev } from "../../runtime/retrieveAssetsDev";
// Define styleFileRE here to match CSS file extensions
export const styleFileRE: RegExp =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/;

/**
 * Plugin to exclude server components from client and SSR bundles
 * while preserving CSS imports for proper styling.
 */
export const serverComponentExclusionPlugin = (): Plugin => {
  let devServer: ViteDevServer;
  return {
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
        // return null
        // Skip if no code provided
        if (!code) return null;

        // More accurate detection of directives using regex
        // Look for directives at the top of the file
        const useClientMatch = /^\s*['"]use client['"];?/m.test(code);
        const useServerMatch = /^\s*['"]use server['"];?/m.test(code);

        if (code.includes("$$proxy")) {
          return;
        }
        // If it has 'use client', it's a client component - let it through
        if (useClientMatch) {
          return null;
        }
        // If it has 'use server', it's a server action - already handled by useServerPlugin
        if (useServerMatch) {
          return null;
        }
        const relPath = path.relative(this.environment.config.root, id);
        if (relPath.startsWith("..") || path.isAbsolute(relPath)) {
          return null;
        }

        if (devServer) {
          try {
            // Try to load the module fully in the rsc env in development
            const mod = await devServer?.environments.rsc.transformRequest(id);
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

        let cssIds: string[] = [];
        if (devServer) {
          // At this point we should have all the css imports
          cssIds = await retrieveAssetsDev(
            [id],
            global.vikeReactRscGlobalState.devServer!.environments.rsc
              .moduleGraph
          );
        } else {
          // TODO: build discovery of css in the current module id
          cssIds = [];
        }

        console.log({ cssIds });

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
          `[RSC Plugin] Excluded server component from ${this.environment?.name} bundle: ${relPath}`
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
  };
};
