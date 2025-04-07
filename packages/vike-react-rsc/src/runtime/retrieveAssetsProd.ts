export { retrieveAssetsProd, buildCssDependencyGraph };

import path from "path";

// Type definitions for the dependency graph
type CssImportMap = Record<string, string[]>;
type JsImportMap = Record<string, string[]>;
type OriginalSourceMap = Record<string, string>;
type CssDependencyGraph = Record<string, Set<string>>;

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
