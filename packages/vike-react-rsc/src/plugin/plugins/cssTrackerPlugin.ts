export { cssTrackerPlugin };

import { tinyassert } from "@hiogawa/utils";
import type { DevEnvironment, Plugin } from "vite";

// Type definitions
type CssImportMap = Record<string, string[]>;
type JsImportMap = Record<string, string[]>;
type OriginalSourceMap = Record<string, string>;
type CssImportInfo = { importee: string; importer: string };
type CssDependencyGraph = Record<string, Set<CssImportInfo>>;

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

  let root: string;

  // Create the dependency collector plugin
  const plugin: Plugin = {
    name: "vike-rsc:collect-css-dependencies",
    applyToEnvironment(environment) {
      return environment.name === "rsc";
    },
    configResolved(config) {
      root = config.root;
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

      // Add direct CSS imports with their importer information
      for (const cssImport of cssImportMapBuild[moduleId] || []) {
        graph[moduleId].add({ importee: cssImport, importer: moduleId });
      }

      // Process JS dependencies recursively
      for (const jsImport of jsImportMapBuild[moduleId] || []) {
        collectCssDependencies(jsImport, new Set(visited));

        // Add CSS imports from the imported module, preserving original importer info
        for (const cssImportInfo of graph[jsImport] || []) {
          graph[moduleId].add(cssImportInfo);
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

  global.vikeReactRscGlobalState.pruneCssRegistry = (id: string) => {
    // Set to track processed modules to avoid circular references
    const removedModuleIds = new Set<string>();

    // Recursive function to remove a module and its dependencies
    function removeModuleAndDependencies(moduleId: string) {
      if (removedModuleIds.has(moduleId)) return;
      removedModuleIds.add(moduleId);

      // Get JS dependencies before deleting the module
      const jsDependencies = [...(jsImportMapBuild[moduleId] || [])];

      // Remove this module from the import maps
      delete cssImportMapBuild[moduleId];
      delete jsImportMapBuild[moduleId];

      // Recursively remove all JS dependencies
      for (const jsDepId of jsDependencies) {
        removeModuleAndDependencies(jsDepId);
      }
    }

    // Start removal from the specified ID
    removeModuleAndDependencies(id);

    // Clean up any references to deleted modules in remaining entries
    for (const [moduleId, jsDeps] of Object.entries(jsImportMapBuild)) {
      jsImportMapBuild[moduleId] = jsDeps.filter(
        (depId) => !removedModuleIds.has(depId)
      );
    }

    // Reset the static graph since it's now outdated
    staticGraph = null;

    if (true) {
      console.log(
        `[CSS Dependency Tracker] Removed module ${id} and ${
          removedModuleIds.size - 1
        } dependencies from the graph`
      );
    }
  };

  global.vikeReactRscGlobalState.getCssDependencies = async (
    id: string
  ): Promise<{
    cssIds: string[];
    jsIds: string[];
  }> => {
    if (!staticGraph) {
      await traverse(
        global.vikeReactRscGlobalState.devServer!.environments.rsc,
        id
      );
    }
    // Build the graph on-demand to ensure we have the latest dependencies
    // In build mode, we build it only once
    const graph = staticGraph || buildGraph();

    // Get CSS dependency information from the graph
    const cssImportInfos = Array.from(graph[id] || new Set());

    // Extract CSS IDs and build the source map
    const cssIds = new Set<string>();
    const jsIds = new Set<string>();

    // Process CSS imports to collect unique IDs
    for (const { importee, importer } of cssImportInfos) {
      cssIds.add(importee);
      jsIds.add(importer);
    }

    const uniqueCssIds = Array.from(cssIds);

    if (true && uniqueCssIds.length > 0) {
      console.log(
        `[CSS Dependency Tracker] Found ${uniqueCssIds.length} CSS dependencies for ${id} from ${jsIds.size} JS modules`
      );
    }

    // Convert resolved CSS IDs to original source paths
    const normalizedCss = await Promise.all(
      uniqueCssIds.map((cssId) =>
        normalizeId({
          id: cssId,
          server: global.vikeReactRscGlobalState.devServer?.environments.rsc,
          root,
        })
      )
    );

    const normalizedJs = await Promise.all(
      Array.from(jsIds).map((jsId) =>
        normalizeId({
          id: jsId,
          server: global.vikeReactRscGlobalState.devServer?.environments.rsc,
          root,
        })
      )
    );

    return {
      cssIds: normalizedCss,
      jsIds: normalizedJs,
    };
  };

  // Return the CSS dependency tracker interface
  return plugin;
}

async function traverse(server: DevEnvironment, entry: string) {
  try {
    const mod = await server.transformRequest(entry);
    const deps = new Set(mod?.deps ?? []);
    for (const dep of deps) {
      try {
        const mod = await server.transformRequest(dep);
        for (const element of mod?.deps ?? []) {
          deps.add(element);
        }
      } catch (error) {}
    }
  } catch (e) {}
}

async function normalizeId({
  id,
  server,
  root,
}: {
  id: string;
  server?: DevEnvironment;
  root?: string;
}) {
  root ??= server?.config.root;
  tinyassert(root);
  if (id.startsWith(root)) {
    id = id.slice(root.length);
  }
  return id.replace("\0", "");
}
