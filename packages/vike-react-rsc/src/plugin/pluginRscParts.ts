import type { RscPluginManager } from "@vitejs/plugin-rsc";
import type { Rollup } from "vite";

// plugin-rsc's internals that the plugins read: no public API gives them

/** The importer plugin-rsc gives a package's "use client" file in dev when no import names it */
export const CLIENT_IN_SERVER_PACKAGE_PROXY = "\0virtual:vite-rsc/client-in-server-package-proxy/";

/** The import of every client reference plugin-rsc has created so far: it keys some by their id with its query, some without */
export function getClientReferenceImports(manager: RscPluginManager): string[] {
  return Object.values(manager.clientReferenceMetaMap).map(({ importId }) => importId);
}

/** The rsc build's output */
export function getRscBundle(manager: RscPluginManager): Rollup.OutputBundle {
  return manager.bundles.rsc!;
}

/** The client chunk group of the rsc module `id`'s client references, if it has any */
export function getClientReferenceGroup(manager: RscPluginManager, id: string): string | undefined {
  return manager.clientReferenceMetaMap[id]?.groupChunkId;
}
