import {
  type Plugin,
  type ResolvedConfig,
  type ViteDevServer,
  type UserConfig,
  type RunnableDevEnvironment,
} from "vite";
import type { ModuleRunner } from "vite/module-runner";
import { transformDirectiveProxyExport } from "@hiogawa/transforms";
import { createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert";

// State for build orchestration
let clientReferences: Record<string, string> = {};
const globalKey = Symbol.for("vite-plugin-vike-rsc:devServer");

export function getDevServerInstance(): ViteDevServer | undefined {
  return (globalThis as any)[globalKey];
}

export function getRscRunner(): ModuleRunner | undefined {
  const server = getDevServerInstance();
  const rscEnv = server?.environments.rsc as RunnableDevEnvironment | undefined;
  return rscEnv?.runner;
}

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

async function normalizeReferenceId(
  id: string,
  name: "client" | "rsc",
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

export default function vikeRscPlugin(): Plugin[] {
  let resolvedConfig: ResolvedConfig;
  let devServer: ViteDevServer;

  return [
    {
      name: "vike-rsc:config",
      enforce: "pre",
      config(): UserConfig {
        return {
          environments: {
            client: {
              optimizeDeps: {
                include: [
                  "react",
                  "react-dom/client",
                  "react-server-dom-webpack/client.browser",
                ],
                exclude: ["react-server-dom-webpack"],
              },
            },
            ssr: {
              optimizeDeps: {
                include: [
                  "react",
                  "react-dom/server.edge",
                  "react-server-dom-webpack/client.edge",
                ],
              },
            },
            rsc: {
              resolve: {
                conditions: ["react-server"],
                noExternal: [
                  /react-server-dom-webpack/,
                  "react",
                  "react/jsx-runtime",
                  "react/jsx-dev-runtime",
                ],
              },
              optimizeDeps: {
                include: [
                  "react",
                  "react/jsx-runtime",
                  "react/jsx-dev-runtime",
                  "react-server-dom-webpack/server.edge",
                ],
                exclude: ["react-server-dom-webpack"],
              },
              build: {
                outDir: "dist/rsc",
                ssr: true,
              },
            },
          },
        };
      },
      configResolved(config) {
        resolvedConfig = config;
      },
      configureServer(server) {
        devServer = server;
        (globalThis as any)[globalKey] = devServer;

        // Initialize runners
        try {
          if (server.environments.rsc)
            (server.environments.rsc as RunnableDevEnvironment).runner;
          if (server.environments.ssr)
            (server.environments.ssr as RunnableDevEnvironment).runner;
          console.log("[RSC Plugin] Dev server runners initialized");
        } catch (e) {
          console.error("[RSC Plugin] Failed to initialize runners:", e);
        }
      },
    },

    // Handle "use client" directives
    {
      name: "vike-rsc:transform-client-directive",
      async transform(code, id) {
        if (this.environment?.name !== "rsc") return;
        if (!code.includes("use client")) return;

        try {
          const ast = this.parse(code);
          const normalizedId = await normalizeReferenceId(
            id,
            "client",
            devServer,
            resolvedConfig
          );

          const output = await transformDirectiveProxyExport(ast, {
            directive: "use client",
            id: normalizedId,
            runtime: "$$register",
          });

          if (!output) return;

          clientReferences[normalizedId] = id;

          output.prepend(`
            import { registerClientReference } from "../register/server";
            const $$register = (id, name) => registerClientReference({}, id, name);
          `);

          return {
            code: output.toString(),
            map: { mappings: "" },
          };
        } catch (error) {
          console.error(
            `[RSC Plugin] Error transforming client directive in ${id}:`,
            error
          );
          return;
        }
      },
    },

    // Create a virtual module for client references
    createVirtualPlugin("client-references", function () {
      assert(this.environment?.name !== "rsc");

      if (this.environment?.mode === "build") {
        return [
          `export default {`,
          ...Object.entries(clientReferences).map(
            ([normalizedId, id]) =>
              `${JSON.stringify(normalizedId)}: () => import(${JSON.stringify(
                id
              )}),\n`
          ),
          `}`,
        ].join("\n");
      }

      return `
        export default {};
        
        // In development mode, client references are imported directly
        // This is a placeholder for the build mode
      `;
    }),

    // Add the reference ID normalizer plugin
    virtualNormalizeReferenceIdPlugin(),
    {
      name: "rsc-misc",
      transform(code, id, _options) {
        if (
          this.environment?.name === "rsc" &&
          id.includes("react-server-dom-webpack")
        ) {
          // rename webpack markers in rsc runtime
          // to avoid conflict with ssr runtime which shares same globals
          code = code.replaceAll(
            "__webpack_require__",
            "__vite_react_server_webpack_require__"
          );
          code = code.replaceAll(
            "__webpack_chunk_load__",
            "__vite_react_server_webpack_chunk_load__"
          );
          return { code, map: null };
        }
        return;
      },
    },
  ];
}
