import type { Plugin } from "vite";
import path from "path";
import { normalizePath } from "vite";
import { getVikeConfig } from "vike/plugin";

export function vikeRscManifestPluginDev(): Plugin {
  const PLACEHOLDER = "__VIKE_RSC_PAGES_MANIFEST__";
  let vikeConfig: ReturnType<typeof getVikeConfig>;
  let root: string;
  return {
    name: "vike-rsc-manifest-dev",
    apply: "serve",
    configResolved(config) {
      vikeConfig = getVikeConfig(config);
      root = config.root;
    },
    applyToEnvironment(environment) {
      return environment.name === "rsc";
    },
    transform(code, _id) {
      if (!code.includes(PLACEHOLDER)) return;
      if (this.environment.name !== "rsc") return;

      const pageIds = Object.keys(vikeConfig.pages);
      const pagesWithGuessedLocations = Object.fromEntries(
        pageIds.map((pageId) => [
          pageId,
          path.resolve(root, pageId, "+Page.tsx"),
        ])
      );

      // Generate the manifest object with importPage functions
      let manifestContent = "{";

      for (const pageId of pageIds) {
        const pageFilePath = pagesWithGuessedLocations[pageId];
        const normalizedPath = normalizePath(pageFilePath);

        manifestContent += `
  "${pageId}": {
    importPage: () => import("${normalizedPath}").then(m => m.default || m.Page)
  },`;
      }

      // Remove trailing comma if present
      if (manifestContent.endsWith(",")) {
        manifestContent = manifestContent.slice(0, -1);
      }
      manifestContent += "\n}";

      // Replace the placeholder with the generated manifest
      const updatedCode = code.replace(
        new RegExp(PLACEHOLDER, "g"),
        manifestContent
      );

      return {
        code: updatedCode,
        map: null,
      };
    },
  };
}
