export { createCssDependencyTracker };

import path from "path";
import type { Plugin } from "vite";

// Type definitions
type CssImportMap = Record<string, string[]>;
type JsImportMap = Record<string, string[]>;
type OriginalSourceMap = Record<string, string>;
type CssDependencyGraph = Record<string, Set<string>>;

// Options for the CSS dependency tracker
interface CssDependencyTrackerOptions {
  // Regular expression to identify CSS files
  styleFileRE?: RegExp;
  // Regular expression to identify JS/TS files
  jsFileRE?: RegExp;
  // Environment name to apply the plugin to
  environmentName?: string;
  // Whether to log debug information
  debug?: boolean;
}

// Default options
const defaultOptions: CssDependencyTrackerOptions = {
  styleFileRE: /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/,
  jsFileRE: /\.(jsx?|tsx?|m?js|cjs)$/,
  environmentName: "rsc",
  debug: false
};

// Interface for the CSS dependency tracker
interface CssDependencyTracker {
  // Plugin to collect dependencies
  collectorPlugin: Plugin;
  // Plugin to build the dependency graph
  graphBuilderPlugin: Plugin;
  // Get CSS dependencies for a module
  getCssDependencies(id: string): string[];
}

/**
 * Creates a CSS dependency tracker for handling CSS imports in build mode
 */
function createCssDependencyTracker(options: CssDependencyTrackerOptions = {}): CssDependencyTracker {
  // Merge options with defaults
  const opts = { ...defaultOptions, ...options };

  // Internal state
  const cssImportMapBuild: CssImportMap = {};
  const jsImportMapBuild: JsImportMap = {};
  const originalSourceMap: OriginalSourceMap = {};
  let cssImportGraph: CssDependencyGraph = {};

  // Build the complete CSS dependency graph
  function buildGraph(): CssDependencyGraph {
    const graph: CssDependencyGraph = {};
    const processedModules = new Set<string>();

    // Initialize with direct CSS imports
    for (const [importer, cssImports] of Object.entries(cssImportMapBuild)) {
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
      for (const cssImport of cssImportMapBuild[moduleId] || []) {
        graph[moduleId].add(cssImport);
      }

      // Process JS dependencies recursively
      for (const jsImport of jsImportMapBuild[moduleId] || []) {
        collectCssDependencies(jsImport, new Set(visited));

        // Add CSS imports from the imported module
        for (const cssImport of graph[jsImport] || []) {
          graph[moduleId].add(cssImport);
        }
      }
    };

    // Process all modules for CSS dependencies
    const allModuleIds = [...new Set([...Object.keys(cssImportMapBuild), ...Object.keys(jsImportMapBuild)])];
    for (const moduleId of allModuleIds) {
      collectCssDependencies(moduleId);
    }

    if (opts.debug) {
      const totalCssImports = Object.values(graph).reduce((sum, set) => sum + set.size, 0);
      console.log(`[CSS Dependency Tracker] Built graph with ${Object.keys(graph).length} modules and ${totalCssImports} CSS imports`);
    }

    return graph;
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
    name: "vike-rsc:collect-css-dependencies",
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

          // Store the original source path for this resolved ID
          originalSourceMap[resolvedId] = source;

          // Initialize arrays only once if needed
          if (!cssImportMapBuild[importer]) cssImportMapBuild[importer] = [];
          if (!jsImportMapBuild[importer]) jsImportMapBuild[importer] = [];

          // Check file type and record in appropriate collection
          if (opts.styleFileRE?.test(resolvedId)) {
            cssImportMapBuild[importer].push(resolvedId);
          } else if (opts.jsFileRE?.test(resolvedId)) {
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
    name: "vike-rsc:build-css-graph",
    apply: "build",
    enforce: "pre",
    applyToEnvironment(environment) {
      return environment.name === opts.environmentName;
    },
    buildEnd() {
      // Build the complete CSS dependency graph
      cssImportGraph = buildGraph();
    }
  };

  // Return the CSS dependency tracker interface
  return {
    collectorPlugin,
    graphBuilderPlugin,
    getCssDependencies(id: string): string[] {
      const cssIds = Array.from(cssImportGraph[id] || new Set());
      if (opts.debug && cssIds.length > 0) {
        console.log(`[CSS Dependency Tracker] Found ${cssIds.length} CSS dependencies for ${id}`);
      }
      return formatCssPaths(id, cssIds);
    }
  };
}
