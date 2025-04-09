import type { Plugin } from 'vite';
import path from 'path';
import { normalizePath } from 'vite';
import type { OutputBundle, OutputChunk } from 'rollup';

/**
 * Vite plugin that generates a manifest for React Server Components during build.
 * Creates a mapping of page IDs to their corresponding config loaders.
 */
export function vikeRscManifestPluginBuild(): Plugin {
    const PLACEHOLDER = '__VIKE_RSC_PAGES_MANIFEST__';

    return {
        name: 'vike-rsc-manifest-build',
        apply: 'build',
        applyToEnvironment(environment) {
            return environment.name === "rsc";
        },
        generateBundle(_outputOptions, bundle: OutputBundle): void {
            // Find chunks that contain our placeholder
            const placeholderChunks: OutputChunk[] = [];

            // Find entry chunks for pages
            const pageEntries: Record<string, { chunkName: string, fileName: string, pageId: string }> = {};

            // First pass: identify placeholder chunks and page entries
            for (const [fileName, output] of Object.entries(bundle)) {
                if (output.type !== 'chunk') continue;

                const chunk = output as OutputChunk;

                // Check if this is a page entry
                if (chunk.isEntry && chunk.facadeModuleId) {
                    const pageId = chunk.facadeModuleId.split('virtual:vike:pageConfigValuesAll:server:')[1];
                    if (pageId) {
                        pageEntries[chunk.name] = {
                            chunkName: chunk.name,
                            fileName,
                            pageId
                        };
                    }
                }

                // Check if this chunk has our placeholder
                if (chunk.code && chunk.code.includes(PLACEHOLDER)) {
                    placeholderChunks.push(chunk);
                }
            }

            // Process each placeholder chunk
            for (const chunk of placeholderChunks) {
                // Generate manifest with IIFE and helper function
                const manifestContent = generateManifestCode(pageEntries, chunk.fileName);

                // Replace placeholder in chunk code
                chunk.code = chunk.code.replace(
                    new RegExp(PLACEHOLDER, 'g'),
                    manifestContent
                );
            }
        }
    };
}

/**
 * Generates the manifest code with an IIFE containing a helper function
 * and the page entries map.
 *
 * @param pageEntries - Record of page entries with their metadata
 * @param chunkFileName - The file name of the current chunk
 * @returns The generated manifest code as a string
 */
function generateManifestCode(
    pageEntries: Record<string, { chunkName: string, fileName: string, pageId: string }>,
    chunkFileName: string
): string {
    // Start of IIFE
    let code = `(function() {
  /**
   * Helper function that extracts config values from the imported module
   * @param {Object} module - The imported module containing configValuesSerialized
   * @returns {Object} - The extracted configuration object
   */
  function extractConfig(module) {
    return Object.fromEntries(
      Object.entries(module.configValuesSerialized).map(([key, value]) => [
        key,
        [Array.isArray(value.valueSerialized)
          ? value.valueSerialized.map(v => v.exportValues?.default || v.exportValues?.[key])
          : value.valueSerialized.exportValues?.default || value.valueSerialized.exportValues?.[key]].flat(1)
      ])
    );
  }

  return {`;

    // Add page entries
    let isFirst = true;
    const chunkDir = path.dirname(chunkFileName);

    for (const entry of Object.values(pageEntries)) {
        if (!isFirst) {
            code += ',';
        }
        isFirst = false;

        // Calculate relative path from placeholder chunk to entry
        const entryPath = path.relative(chunkDir, entry.fileName);

        // Normalize path to POSIX format for cross-platform compatibility
        const normalizedPath = normalizePath(entryPath);
        const importPath = normalizedPath.startsWith('.')
            ? normalizedPath
            : `./${normalizedPath}`;

        // Create a getConfig function that uses the helper
        code += `
    "${entry.pageId}": {
      getConfig: () => import("${importPath}").then(extractConfig)
    }`;
    }

    // Close the IIFE
    code += `
  };
})()`;

    return code;
}