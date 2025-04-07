export { retrieveAssetsProd, buildCssDependencyGraph, collectDependencies };

import path from "path";
import type { Plugin } from "vite";

// Type definitions for the dependency graph
type CssImportMap = Record<string, string[]>;
type JsImportMap = Record<string, string[]>;
type OriginalSourceMap = Record<string, string>;
type CssDependencyGraph = Record<string, Set<string>>;

// Interface for dependency collection result
interface DependencyCollectionResult {
  cssImportMapBuild: CssImportMap;
  jsImportMapBuild: JsImportMap;
  originalSourceMap: OriginalSourceMap;
}

/**
 * Collects CSS and JS dependencies during the build process
 */
function collectDependencies(styleFileRE: RegExp): {
  plugin: Plugin;
  getResult: () => DependencyCollectionResult;
} {
  const result: DependencyCollectionResult = {
    cssImportMapBuild: {},
    jsImportMapBuild: {},
    originalSourceMap: {}
  };

  return {
    plugin: {
      name: "vike-rsc:collect-dependencies",
      apply: "build",
      enforce: "pre",
      applyToEnvironment(environment) {
        return environment.name === "rsc";
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
            result.originalSourceMap[resolvedId] = source;

            // Initialize arrays only once if needed
            if (!result.cssImportMapBuild[importer]) result.cssImportMapBuild[importer] = [];
            if (!result.jsImportMapBuild[importer]) result.jsImportMapBuild[importer] = [];

            // Check file type and record in appropriate collection
            if (styleFileRE.test(resolvedId)) {
              result.cssImportMapBuild[importer].push(resolvedId);
            } else if (/\.(jsx?|tsx?|m?js|cjs)$/.test(resolvedId)) {
              result.jsImportMapBuild[importer].push(resolvedId);
            }
          } catch (error) {
            // Silently ignore resolution errors
          }
        },
      }
    },
    getResult: () => result
  };
}

/**
 * Builds a complete CSS dependency graph for production mode
 */
function buildCssDependencyGraph(
  cssImportMapBuild: CssImportMap,
  jsImportMapBuild: JsImportMap
): CssDependencyGraph {
  const cssImportGraph: CssDependencyGraph = {};
  const processedModules = new Set<string>();

  // Initialize with direct CSS imports
  for (const [importer, cssImports] of Object.entries(cssImportMapBuild)) {
    cssImportGraph[importer] = new Set(cssImports);
  }

  // Function to recursively collect CSS dependencies
  const collectCssDependencies = (moduleId: string, visited = new Set<string>()) => {
    if (visited.has(moduleId) || processedModules.has(moduleId)) return;
    visited.add(moduleId);
    processedModules.add(moduleId);

    // Initialize CSS imports set if not exists
    cssImportGraph[moduleId] = cssImportGraph[moduleId] || new Set();

    // Add direct CSS imports
    for (const cssImport of cssImportMapBuild[moduleId] || []) {
      cssImportGraph[moduleId].add(cssImport);
    }

    // Process JS dependencies recursively
    for (const jsImport of jsImportMapBuild[moduleId] || []) {
      collectCssDependencies(jsImport, new Set(visited));

      // Add CSS imports from the imported module
      for (const cssImport of cssImportGraph[jsImport] || []) {
        cssImportGraph[moduleId].add(cssImport);
      }
    }
  };

  // Process all modules
  for (const moduleId of [...Object.keys(cssImportMapBuild), ...Object.keys(jsImportMapBuild)]) {
    collectCssDependencies(moduleId);
  }

  return cssImportGraph;
}

/**
 * Retrieves CSS assets for a module in production mode
 */
function retrieveAssetsProd(
  id: string,
  cssImportGraph: CssDependencyGraph,
  originalSourceMap: OriginalSourceMap = {}
): string[] {
  const cssIds = Array.from(cssImportGraph[id] || new Set());

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
