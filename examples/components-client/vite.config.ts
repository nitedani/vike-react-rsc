import { fileURLToPath } from "node:url";
import vike from "vike/plugin";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    { enforce: "pre", ...mdx() },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    vike(),
    // An import only a plugin resolves, as vite-tsconfig-paths resolves the tsconfig's paths
    {
      name: "plugin-import",
      resolveId: (source) => (source.startsWith("@plugin/") ? fileURLToPath(new URL(`./${source.slice("@plugin/".length)}.tsx`, import.meta.url)) : undefined),
    },
  ],
  resolve: {
    // pnpm can give the linked vike-react-rsc its own copy of vike, and the browser would load both
    // TODO: remove once https://github.com/universal-deploy/universal-deploy/pull/51 is released
    dedupe: ["vike"],
    // A path alias only Vite knows, which Vike leaves to Vite in an import: string
    alias: { "@app": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
