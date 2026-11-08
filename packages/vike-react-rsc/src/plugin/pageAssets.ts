import { getPluginApi } from "@vitejs/plugin-rsc";
import type { Plugin, Rollup } from "vite";
import { getRscPageEntry } from "./vikeParts";

/** Vike preloads the fonts it finds in a page's client entry. A server component's fonts are only in the rsc build's chunks, and a client
 * component's only behind the page's dynamic import of its client references, so each page's client entry lists those too. */
export function pageAssets(): Plugin {
  return {
    name: "vike-react-rsc:page-assets",
    apply: "build",
    generateBundle(_options, clientBundle) {
      if (this.environment.name !== "client") return;
      const { manager } = getPluginApi(this.environment.getTopLevelConfig())!;
      for (const clientEntry of Object.values(clientBundle)) {
        if (clientEntry.type !== "chunk") continue;
        const rscPageEntry = getRscPageEntry(clientEntry.facadeModuleId);
        if (!rscPageEntry) continue;
        const rscChunks = getStaticChunks(manager.bundles.rsc!, rscPageEntry);
        const referenceGroups = new Set(rscChunks.flatMap(({ moduleIds }) => moduleIds.flatMap((id) => manager.clientReferenceMetaMap[id]?.groupChunkId ?? [])));
        const clientChunks = [...referenceGroups].flatMap((group) => getStaticChunks(clientBundle, group));
        for (const chunk of [...rscChunks, ...clientChunks]) {
          for (const asset of chunk.viteMetadata?.importedAssets ?? []) clientEntry.viteMetadata!.importedAssets.add(asset);
        }
      }
    },
  };
}

// The entry chunk of the module `facadeModuleId` and the chunks it statically imports, as Vike's walk of the client manifest does
function getStaticChunks(bundle: Rollup.OutputBundle, facadeModuleId: string): Rollup.OutputChunk[] {
  const entry = Object.values(bundle).find((output) => output.type === "chunk" && output.facadeModuleId === facadeModuleId);
  if (entry?.type !== "chunk") return [];
  const chunks = new Set([entry]);
  for (const chunk of chunks) {
    for (const fileName of chunk.imports) {
      const imported = bundle[fileName];
      if (imported?.type === "chunk") chunks.add(imported);
    }
  }
  return [...chunks];
}
