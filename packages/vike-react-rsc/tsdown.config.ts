import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/config.ts",
    "src/server.ts",
    "src/server.rsc.ts",
    "src/client.tsx",
    "src/client.rsc.ts",
    "src/__internal/browser.ts",
    "src/__internal/ssr.server.ts",
    "src/__internal/rsc.ts",
    "src/hooks/pageContext/pageContext-client.tsx",
    "src/hooks/pageContext/pageContext-server.tsx",
  ],
  format: ["esm"],
  // The exports map resolves to dist/*.js, so output extensions must stay .js.
  fixedExtension: false,
  deps: {
    neverBundle: [/^vike-react-rsc\//, /^@vitejs\/plugin-rsc\//],
  },
  dts: {
    sourcemap: process.argv.slice(2).includes("--sourcemap"),
  },
});
