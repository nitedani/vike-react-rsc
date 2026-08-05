import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/config.ts",
    "src/server.ts",
    "src/client.tsx",
    "src/integration/onBeforeRender.tsx",
    "src/integration/onRenderHtml.tsx",
    "src/integration/onRenderClient.tsx",
    "src/integration/onPageTransitionStart.tsx",
    "src/integration/rscMiddleware.ts",
    "src/register/browser.tsx",
    "src/register/server.tsx",
    "src/register/ssr.tsx",
    "src/runtime/server.tsx",
    "src/runtime/ssr.tsx",
    "src/hooks/pageContext/pageContext-client.tsx",
    "src/hooks/pageContext/pageContext-server.tsx",
  ],
  format: ["esm"],
  // The exports map resolves to dist/*.js, so output extensions must stay .js.
  fixedExtension: false,
  deps: {
    neverBundle: [/^virtual:/, /^vike-react-rsc\//, /^@vitejs\/plugin-rsc\//],
  },
  dts: {
    sourcemap: process.argv.slice(2).includes("--sourcemap"),
  },
});
