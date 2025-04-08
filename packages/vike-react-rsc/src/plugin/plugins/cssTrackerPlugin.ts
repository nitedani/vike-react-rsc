export { cssTrackerPlugin };

import type { Plugin } from "vite";

// Type definitions
type CssImportMap = Record<string, string[]>;
type JsImportMap = Record<string, string[]>;
type OriginalSourceMap = Record<string, string>;
type CssDependencyGraph = Record<string, Set<string>>;

const styleFileRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/;
const jsFileRE = /\.(jsx?|tsx?|m?js|cjs)$/;

/**
 * Creates a CSS dependency tracker for proxying CSS imports from rsc to client
 */
function cssTrackerPlugin(): Plugin {
  // Internal state
  const cssImportMapBuild: CssImportMap = {};
  const jsImportMapBuild: JsImportMap = {};
  const originalSourceMap: OriginalSourceMap = {};

  // Create the dependency collector plugin
  const plugin: Plugin = {
    name: "vike-rsc:collect-css-dependencies",
    applyToEnvironment(environment) {
      return environment.name === "rsc";
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

          // Store the original source path for this resolved ID
          originalSourceMap[resolvedId] = source;

          // Initialize arrays only once if needed
          if (!cssImportMapBuild[importer]) cssImportMapBuild[importer] = [];
          if (!jsImportMapBuild[importer]) jsImportMapBuild[importer] = [];

          // Check file type and record in appropriate collection
          if (styleFileRE?.test(resolvedId)) {
            if (!cssImportMapBuild[importer].includes(resolvedId)) {
              cssImportMapBuild[importer].push(resolvedId);
            }
          } else if (jsFileRE?.test(resolvedId)) {
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
      if (!global.vikeReactRscGlobalState.disableUseClientPlugin) {
        staticGraph = buildGraph();
      }
    },
  };

  let staticGraph: CssDependencyGraph | null = null;
  // Function to compute the CSS dependency graph on-demand
  function buildGraph(): CssDependencyGraph {
    const graph: CssDependencyGraph = {};
    const processedModules = new Set<string>();

    // Function to recursively collect CSS dependencies
    const collectCssDependencies = (
      moduleId: string,
      visited = new Set<string>()
    ) => {
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
    const allModuleIds = [
      ...new Set([
        ...Object.keys(cssImportMapBuild),
        ...Object.keys(jsImportMapBuild),
      ]),
    ];
    for (const moduleId of allModuleIds) {
      collectCssDependencies(moduleId);
    }

    if (true) {
      const totalCssImports = Object.values(graph).reduce(
        (sum, set) => sum + set.size,
        0
      );
      console.log(
        `[CSS Dependency Tracker] Built graph with ${
          Object.keys(graph).length
        } modules and ${totalCssImports} CSS imports`
      );
    }

    return graph;
  }

  global.vikeReactRscGlobalState.getCssDependencies = (
    id: string
  ): string[] => {
    // Build the graph on-demand to ensure we have the latest dependencies
    // In build mode, we build it only once
    const graph = staticGraph || buildGraph();

    const cssIds = Array.from(graph[id] || new Set());

    if (true && cssIds.length > 0) {
      console.log(
        `[CSS Dependency Tracker] Found ${cssIds.length} CSS dependencies for ${id}`
      );
    }

    // Convert resolved IDs to original source paths
    return cssIds.map((cssId) => originalSourceMap[cssId] || cssId);
  };

  // Return the CSS dependency tracker interface
  return plugin;
}
