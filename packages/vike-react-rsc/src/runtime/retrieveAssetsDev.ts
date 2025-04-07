export { retrieveAssetsDev };

import { tinyassert } from "@hiogawa/utils";
import type { EnvironmentModuleGraph, EnvironmentModuleNode } from "vite";
export const styleFileRE: RegExp =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/;

async function retrieveAssetsDev(
  ids: string[],
  moduleGraph: EnvironmentModuleGraph
): Promise<string[]> {
  const visitedModules = new Set<string>();
  const assetUrls = new Set<string>();
  await Promise.all(
    ids.map(async (id) => {
      if (id.startsWith("@@vike")) return;
      tinyassert(id);
      const [_, graphId] = await moduleGraph.resolveUrl(id);
      tinyassert(graphId);
      const mod = moduleGraph.getModuleById(graphId);
      if (!mod) {
        return;
      }
      tinyassert(mod);
      collectCss(mod, assetUrls, visitedModules);
    })
  );
  return Array.from(assetUrls);
}

function collectCss(
  mod: EnvironmentModuleNode,
  styleUrls: Set<string>,
  visitedModules: Set<string>,
  importer?: EnvironmentModuleNode
): void {
  tinyassert(mod);
  if (!mod.url) return;
  if (visitedModules.has(mod.url)) return;
  visitedModules.add(mod.url);
  if (isStyle(mod) && (!importer || !isStyle(importer))) {
    if (mod.url.startsWith("\0")) {
      styleUrls.add(mod.url.substring(1));
    } else {
      styleUrls.add(mod.url);
    }
  }
  mod.importedModules.forEach((dep) => {
    collectCss(dep, styleUrls, visitedModules, mod);
  });
}

function isStyle(mod: EnvironmentModuleNode) {
  return (
    mod.type === "css" ||
    styleFileRE.test(mod.url) ||
    (mod.id && /\?vue&type=style/.test(mod.id))
  );
}
