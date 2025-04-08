export { createClientDependencyTracker };

import type { Plugin } from "vite";

// Type definitions
type JsImportMap = Record<string, string[]>;

// Options for the client dependency tracker
interface ClientDependencyTrackerOptions {
  // Regular expression to identify JS/TS files
  jsFileRE?: RegExp;
  // Environment name to apply the plugin to
  environmentName?: string;
  // Whether to log debug information
  debug?: boolean;
  // Client references to track dependencies for
  clientReferences?: Record<string, string>;
}

// Default options
const defaultOptions: ClientDependencyTrackerOptions = {
  jsFileRE: /\.(jsx?|tsx?|m?js|cjs)$/,
  environmentName: "rsc",
  debug: false,
  clientReferences: {}
};

// Interface for the client dependency tracker
interface ClientDependencyTracker {
  // Plugin to collect dependencies
  collectorPlugin: Plugin;
  // Plugin to build the dependency graph
  graphBuilderPlugin: Plugin;
  // Check if a module is a client dependency
  isClientDependency(id: string): boolean;
}

/**
 * Creates a client dependency tracker for handling client component dependencies in build mode
 */
function createClientDependencyTracker(options: ClientDependencyTrackerOptions = {}): ClientDependencyTracker {
  // Merge options with defaults
  const opts = { ...defaultOptions, ...options };

  // Internal state
  const jsImportMapBuild: JsImportMap = {};
  const clientDependencies = new Set<string>();

  // Track client reference dependencies
  const clientReferences = opts.clientReferences || {};

  // Build the client dependency graph
  function buildGraph(): void {
    // Function to recursively collect client dependencies
    const collectClientDependencies = (moduleId: string, visited = new Set<string>()) => {
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
    for (const clientRefPath of Object.values(clientReferences)) {
      collectClientDependencies(clientRefPath, new Set());
    }

    if (opts.debug) {
      console.log(`[Client Dependency Tracker] Found ${clientDependencies.size} client reference dependencies`);
    }
  }

  // Create the dependency collector plugin
  const collectorPlugin: Plugin = {
    name: "vike-rsc:collect-client-dependencies",
    apply: "build",
    enforce: "pre",
    applyToEnvironment(environment) {
      return environment.name === opts.environmentName;
    },
    resolveId: {
      order: "pre",
      async handler(source, importer, options) {
        // Skip if no importer, virtual modules, or node_modules
        if (!importer || source.includes('\0') || source.includes('node_modules')) return;

        try {
          // Resolve the source to get the full path
          const resolved = await this.resolve(source, importer, { skipSelf: true, ...options });
          if (!resolved) return;

          const resolvedId = resolved.id;

          // Initialize arrays only once if needed
          if (!jsImportMapBuild[importer]) jsImportMapBuild[importer] = [];

          // Check file type and record in appropriate collection
          if (opts.jsFileRE?.test(resolvedId)) {
            jsImportMapBuild[importer].push(resolvedId);
          }
        } catch (error) {
          // Silently ignore resolution errors
        }
      },
    }
  };

  // Create the graph builder plugin
  const graphBuilderPlugin: Plugin = {
    name: "vike-rsc:build-client-graph",
    apply: "build",
    enforce: "pre",
    applyToEnvironment(environment) {
      return environment.name === opts.environmentName;
    },
    buildEnd() {
      // Build the client dependency graph
      buildGraph();
    }
  };

  // Return the client dependency tracker interface
  return {
    collectorPlugin,
    graphBuilderPlugin,
    isClientDependency(id: string): boolean {
      // Check if the module is a client reference
      if (Object.values(clientReferences).includes(id)) {
        if (opts.debug) {
          console.log(`[Client Dependency Tracker] ${id} is a client reference`);
        }
        return true;
      }

      // Check if the module is a dependency of a client reference
      const isClientDep = clientDependencies.has(id);
      if (isClientDep && opts.debug) {
        console.log(`[Client Dependency Tracker] ${id} is a client dependency`);
      }
      return isClientDep;
    }
  };
}
