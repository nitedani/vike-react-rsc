import type { Plugin } from 'vite';
import path from 'path';
import { normalizePath } from 'vite';
import type { OutputBundle, OutputChunk } from 'rollup';


export function vikeRscManifestPluginBuild(): Plugin {
    const PLACEHOLDER = '__VITE_ASSETS_MANIFEST_RSC__';

    return {
        name: 'vike-rsc-manifest-build',
        apply: 'build',
        applyToEnvironment(environment) {
            return environment.name === "rsc"
        },
        generateBundle(outputOptions, bundle: OutputBundle): void {
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
                // Generate manifest for dynamic imports
                let manifestContent = '{';
                let isFirst = true;

                for (const entry of Object.values(pageEntries)) {
                    if (!isFirst) {
                        manifestContent += ',';
                    }
                    isFirst = false;

                    // Calculate relative path from placeholder chunk to entry
                    const chunkDir = path.dirname(chunk.fileName);
                    const entryPath = path.relative(chunkDir, entry.fileName);

                    // Normalize path to POSIX format
                    const normalizedPath = normalizePath(entryPath);
                    const importPath = normalizedPath.startsWith('.')
                        ? normalizedPath
                        : `./${normalizedPath}`;

                    // Create a dynamic import function for this page
                    manifestContent += `
  "${entry.pageId}": {
    importPage: () => import("${importPath}").then(m => m.configValuesSerialized.Page.valueSerialized.exportValues).then(m => m.default || m.Page)
  }`;
                }

                manifestContent += '\n}';

                // Replace placeholder in chunk code
                chunk.code = chunk.code.replace(
                    new RegExp(PLACEHOLDER, 'g'),
                    manifestContent
                );
            }
        }
    };
}