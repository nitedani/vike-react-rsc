export { createDependencyManager };

import path from "path";
import type { Plugin } from "vite";

// Type definitions
type ModuleDependencyMap = Record<string, string[]>;
type OriginalSourceMap = Record<string, string>;
type DependencyGraph = Record<string, Set<string>>;

// Options for the dependency manager
interface DependencyManagerOptions {
  // Regular expression to identify CSS files
  styleFileRE?: RegExp;
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
const defaultOptions: DependencyManagerOptions = {
  styleFileRE: /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/,
  jsFileRE: /\.(jsx?|tsx?|m?js|cjs)$/,
  environmentName: "rsc",
  debug: false
};

// Interface for the dependency manager
interface DependencyManager {
  // Plugin to collect dependencies
  collectorPlugin: Plugin;
  // Plugin to build the dependency graph
  graphBuilderPlugin: Plugin;
  // Get CSS dependencies for a module
  getCssDependencies(id: string): string[];
  // Check if a module is a dependency of any client reference
  isClientDependency(id: string): boolean;
  // Dev server instance (for development mode)
  devServer?: any;
}

/**
 * Creates a dependency manager for handling module dependencies
 * Works in both development and build modes
 */
function createDependencyManager(options: DependencyManagerOptions = {}): DependencyManager {
  // Merge options with defaults
  const opts = { ...defaultOptions, ...options };

  // Internal state
  const cssDependencyMap: ModuleDependencyMap = {};
  const jsDependencyMap: ModuleDependencyMap = {};
  const originalSourceMap: OriginalSourceMap = {};
  let cssDependencyGraph: DependencyGraph = {};

  // Track client reference dependencies
  const clientReferences = opts.clientReferences || {};
  const clientDependencies = new Set<string>();

  // Build the complete dependency graphs
  function buildGraphs() {
    // Build CSS dependency graph
    const cssGraph = buildCssDependencyGraph();

    // Build client dependency graph
    buildClientDependencyGraph();

    return cssGraph;
  }

  // Build the CSS dependency graph
  function buildCssDependencyGraph(): DependencyGraph {
    const graph: DependencyGraph = {};
    const processedModules = new Set<string>();

    // Initialize with direct CSS imports
    for (const [importer, cssImports] of Object.entries(cssDependencyMap)) {
      graph[importer] = new Set(cssImports);
    }

    // Function to recursively collect CSS dependencies
    const collectCssDependencies = (moduleId: string, visited = new Set<string>()) => {
      if (visited.has(moduleId) || processedModules.has(moduleId)) return;
      visited.add(moduleId);
      processedModules.add(moduleId);

      // Initialize CSS imports set if not exists
      graph[moduleId] = graph[moduleId] || new Set();

      // Add direct CSS imports
      for (const cssImport of cssDependencyMap[moduleId] || []) {
        graph[moduleId].add(cssImport);
      }

      // Process JS dependencies recursively
      for (const jsImport of jsDependencyMap[moduleId] || []) {
        collectCssDependencies(jsImport, new Set(visited));

        // Add CSS imports from the imported module
        for (const cssImport of graph[jsImport] || []) {
          graph[moduleId].add(cssImport);
        }
      }
    };

    // Process all modules for CSS dependencies
    const allModuleIds = [...new Set([...Object.keys(cssDependencyMap), ...Object.keys(jsDependencyMap)])];
    for (const moduleId of allModuleIds) {
      collectCssDependencies(moduleId);
    }

    if (opts.debug) {
      const totalCssImports = Object.values(graph).reduce((sum, set) => sum + set.size, 0);
      console.log(`[Dependency Manager] Built CSS graph with ${Object.keys(graph).length} modules and ${totalCssImports} CSS imports`);
    }

    return graph;
  }

  // Build the client dependency graph
  function buildClientDependencyGraph() {
    // Function to recursively collect client dependencies
    const collectClientDependencies = (moduleId: string, visited = new Set<string>()) => {
      if (visited.has(moduleId)) return;
      visited.add(moduleId);

      // Mark this module as a client dependency
      clientDependencies.add(moduleId);

      // Process JS dependencies recursively
      for (const jsImport of jsDependencyMap[moduleId] || []) {
        collectClientDependencies(jsImport, new Set(visited));
      }
    };

    // Start from all client references
    for (const clientRefPath of Object.values(clientReferences)) {
      collectClientDependencies(clientRefPath, new Set());
    }

    if (opts.debug) {
      console.log(`[Dependency Manager] Found ${clientDependencies.size} client reference dependencies`);
    }
  }

  // Format CSS paths for use in imports
  function formatCssPaths(id: string, cssIds: string[]): string[] {
    return cssIds.map(cssPath => {
      // Use original source path if available
      if (originalSourceMap[cssPath]) {
        return originalSourceMap[cssPath];
      }

      // Remove null byte prefix
      if (cssPath.startsWith("\0")) {
        cssPath = cssPath.substring(1);
      }

      // Make absolute paths relative to the importer
      if (path.isAbsolute(cssPath) && path.isAbsolute(id)) {
        const importerDir = path.dirname(id);
        const relativePath = path.relative(importerDir, cssPath);

        // Ensure proper path format for Vite
        if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
          return './' + relativePath;
        }
        return relativePath;
      }

      return cssPath;
    });
  }

  // Create the dependency collector plugin
  const collectorPlugin: Plugin = {
    name: "vike-rsc:collect-dependencies",
    apply() {
      // Apply in both development and build modes
      return true;
    },
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

          // Store the original source path for this resolved ID
          originalSourceMap[resolvedId] = source;

          // Initialize arrays only once if needed
          if (!cssDependencyMap[importer]) cssDependencyMap[importer] = [];
          if (!jsDependencyMap[importer]) jsDependencyMap[importer] = [];

          // Check file type and record in appropriate collection
          if (opts.styleFileRE?.test(resolvedId)) {
            cssDependencyMap[importer].push(resolvedId);
          } else if (opts.jsFileRE?.test(resolvedId)) {
            jsDependencyMap[importer].push(resolvedId);
          }
        } catch (error) {
          // Silently ignore resolution errors
        }
      },
    }
  };

  // Create the graph builder plugin
  const graphBuilderPlugin: Plugin = {
    name: "vike-rsc:build-dependency-graph",
    apply() {
      // Apply in both development and build modes
      return true;
    },
    enforce: "pre",
    applyToEnvironment(environment) {
      return environment.name === opts.environmentName;
    },
    buildEnd() {
      // Build the complete dependency graphs
      cssDependencyGraph = buildGraphs();
    }
  };

  // Return the dependency manager interface
  return {
    collectorPlugin,
    graphBuilderPlugin,
    getCssDependencies(id: string): string[] {
      const cssIds = Array.from(cssDependencyGraph[id] || new Set());
      if (opts.debug && cssIds.length > 0) {
        console.log(`[Dependency Manager] Found ${cssIds.length} CSS dependencies for ${id} (build mode)`);
      }
      return formatCssPaths(id, cssIds);
    },
    isClientDependency(id: string): boolean {
      return clientDependencies.has(id);
    }
  };
}
