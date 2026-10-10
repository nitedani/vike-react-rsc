import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/config.ts",
    "src/server.ts",
    "src/server.rsc.ts",
    "src/client.tsx",
    "src/client.rsc.ts",
    "src/integration/onRenderHtml.tsx",
    "src/integration/onRenderClient.tsx",
    "src/integration/onPageTransitionStart.tsx",
    "src/integration/onCreatePageContext.server.ts",
    "src/integration/actionMiddleware.ts",
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
