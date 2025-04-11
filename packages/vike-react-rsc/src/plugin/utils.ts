import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert";

export {
  normalizeReferenceId,
  virtualNormalizeReferenceIdPlugin,
  createVirtualPlugin,
  hashString,
};

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

async function normalizeReferenceId(
  id: string,
  name: "client" | "rsc" | "ssr",
  server: ViteDevServer,
  config: ResolvedConfig
): Promise<string> {
  if (!server) {
    return hashString(path.relative(config.root, id));
  }

  // Align with how Vite import analysis would rewrite id to avoid double modules
  const environment = server.environments[name]!;
  const transformed = await environment.transformRequest(
    "virtual:normalize-reference-id/" + encodeURIComponent(id)
  );
  assert(transformed);
  const m = transformed.code.match(
    /(?:__vite_ssr_dynamic_import__|import)\("(.*)"\)/
  );
  const newId = m?.[1];
  if (!newId) {
    console.error("[normalizeReferenceId]", {
      name,
      id,
      code: transformed.code,
    });
    throw new Error("normalizeReferenceId");
  }
  return newId;
}

// Helper to create virtual plugins
function createVirtualPlugin(name: string, load: Plugin["load"]): Plugin {
  name = "virtual:" + name;
  return {
    name: `virtual-${name}`,
    resolveId(source) {
      return source === name ? "\0" + name : undefined;
    },
    load(id) {
      if (id === "\0" + name) {
        return (load as Function).apply(this);
      }
    },
  };
}

function virtualNormalizeReferenceIdPlugin(): Plugin {
  const prefix = "virtual:normalize-reference-id/";
  return {
    name: "virtual-normalize-reference-id",
    apply: "serve",
    resolveId(source) {
      if (source.startsWith(prefix)) {
        return "\0" + source;
      }
    },
    load(id) {
      if (id.startsWith("\0" + prefix)) {
        const decodedId = decodeURIComponent(id.slice(prefix.length + 1));
        return `export default () => import("${decodedId}")`;
      }
    },
  };
}
