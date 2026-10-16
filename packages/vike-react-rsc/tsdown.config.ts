import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/config.ts",
    "src/server.ts",
    "src/server.rsc.ts",
    "src/client.ts",
    "src/client.rsc.ts",
    "src/__internal/browser.ts",
    "src/__internal/ssr.server.ts",
    "src/__internal/rsc.ts",
    "src/__internal/middleware.ts",
    "src/pageContext.tsx",
    "src/pageContext.rsc.ts",
  ],
  format: ["esm"],
  // The exports map resolves to dist/*.js, so output extensions must stay .js.
  fixedExtension: false,
  dts: {
    sourcemap: process.argv.slice(2).includes("--sourcemap"),
  },
});
