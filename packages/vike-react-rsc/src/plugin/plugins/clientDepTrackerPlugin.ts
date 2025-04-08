export { clientDepTrackerPlugin };

import type { Plugin } from "vite";

// Type definitions
type JsImportMap = Record<string, string[]>;

const jsFileRE = /\.(jsx?|tsx?|m?js|cjs)$/;

/**
 * Creates a client dependency tracker for handling client component dependencies in build mode
 */
function clientDepTrackerPlugin(): Plugin {
  // Merge options with defaults
  // Internal state
  const jsImportMapBuild: JsImportMap = {};
  const clientDependencies = new Set<string>();

  // Build the client dependency graph
  function buildGraph(): void {
    // Function to recursively collect client dependencies
    const collectClientDependencies = (
      moduleId: string,
      visited = new Set<string>()
    ) => {
      if (visited.has(moduleId)) return;
      visited.add(moduleId);

      // Mark this module as a client dependency
      clientDependencies.add(moduleId);

      // Process JS dependencies recursively
      for (const jsImport of jsImportMapBuild[moduleId] || []) {
        collectClientDependencies(jsImport, new Set(visited));
      }
    };

    // Start from all client references
    for (const clientRefPath of Object.values(
      global.vikeReactRscGlobalState.clientReferences
    )) {
      collectClientDependencies(clientRefPath, new Set());
    }

    if (true) {
      console.log(
        `[Client Dependency Tracker] Found ${clientDependencies.size} client reference dependencies`
      );
    }
  }

  // Create a unified plugin for collection and graph building
  const plugin: Plugin = {
    name: "vike-rsc:client-dependency-tracker",
    apply: "build",
    enforce: "pre",
    applyToEnvironment(environment) {
      return environment.name === "rsc";
    },
    resolveId: {
      order: "pre",
      async handler(source, importer, options) {
        if (!global.vikeReactRscGlobalState.disableUseClientPlugin) {
          return;
        }
        // Skip if no importer, virtual modules, or node_modules
        if (
          !importer ||
          source.includes("\0") ||
          source.includes("node_modules")
        )
          return;

        try {
          // Resolve the source to get the full path
          const resolved = await this.resolve(source, importer, {
            skipSelf: true,
            ...options,
          });
          if (!resolved) return;

          const resolvedId = resolved.id;

          // Initialize arrays only once if needed
          if (!jsImportMapBuild[importer]) jsImportMapBuild[importer] = [];

          // Check file type and record in appropriate collection
          if (jsFileRE?.test(resolvedId)) {
            jsImportMapBuild[importer].push(resolvedId);
          }
        } catch (error) {
          // Silently ignore resolution errors
        }
      },
    },
    buildEnd() {
      if (!global.vikeReactRscGlobalState.disableUseClientPlugin) {
        buildGraph();
      }
    },
  };

  global.vikeReactRscGlobalState.isClientDependency = (id: string): boolean => {
    // Check if the module is a client reference
    if (
      Object.values(global.vikeReactRscGlobalState.clientReferences).includes(
        id
      )
    ) {
      if (true) {
        console.log(`[Client Dependency Tracker] ${id} is a client reference`);
      }
      return true;
    }

    // Check if the module is a dependency of a client reference
    const isClientDep = clientDependencies.has(id);
    if (isClientDep && true) {
      console.log(`[Client Dependency Tracker] ${id} is a client dependency`);
    }
    return isClientDep;
  };
  return plugin;
}
