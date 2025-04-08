export { clientDepTrackerPlugin };

import type { Plugin } from "vite";

// Type definitions
type JsImportMap = Record<string, string[]>;

const jsFileRE = /\.(jsx?|tsx?|m?js|cjs)$/;

/**
 * Creates a client dependency tracker for handling client component dependencies
 * Works in both development and build modes with on-demand dependency tracking
 */
function clientDepTrackerPlugin(): Plugin {
  // Internal state
  const jsImportMapBuild: JsImportMap = {};
  let staticGraph: Set<string> | null = null;

  // Build the client dependency graph and return the client dependencies set
  function buildGraph(): Set<string> {
    const clientDependencies = new Set<string>();

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
      global.vikeReactRscGlobalState.clientReferences || {}
    )) {
      collectClientDependencies(clientRefPath, new Set());
    }

    if (true) {
      console.log(
        `[Client Dependency Tracker] Found ${clientDependencies.size} client reference dependencies`
      );
    }

    return clientDependencies;
  }

  let command: "build" | "serve";
  // Create a unified plugin for collection and graph building
  const plugin: Plugin = {
    name: "vike-rsc:client-dependency-tracker",
    enforce: "pre",
    apply(_, v) {
      command = v.command;
      return true;
    },
    resolveId: {
      order: "pre",
      async handler(source, importer, options) {
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
            if (!jsImportMapBuild[importer].includes(resolvedId)) {
              jsImportMapBuild[importer].push(resolvedId);
            }
          }
        } catch (error) {
          // Silently ignore resolution errors
        }
      },
    },
    buildEnd() {
      if (
        this.environment.name === "rsc" &&
        !global.vikeReactRscGlobalState.disableUseClientPlugin
      ) {
        staticGraph = buildGraph();
      }
    },
  };

  global.vikeReactRscGlobalState.isClientDependency = (id: string): boolean => {
    // Build the graph on-demand to ensure we have the latest dependencies
    // In build mode, we build it only once
    const dependencies = staticGraph || buildGraph();

    // Check if the module is a client reference
    if (
      Object.values(
        global.vikeReactRscGlobalState.clientReferences || {}
      ).includes(id)
    ) {
      if (true) {
        console.log(`[Client Dependency Tracker] ${id} is a client reference`);
      }
      return true;
    }

    // Check if the module is a dependency of a client reference
    const isClientDep = dependencies.has(id);
    if (isClientDep && true) {
      console.log(`[Client Dependency Tracker] ${id} is a client dependency`);
    }
    return isClientDep;
  };

  return plugin;
}
