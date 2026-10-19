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
    "src/__internal/onError.ts",
    "src/pageContext.tsx",
    "src/pageContext.rsc.ts",
    "src/hooks/usePageContext.tsx",
    "src/hooks/usePageContext.rsc.ts",
    "src/hooks/useData.tsx",
    "src/hooks/useData.rsc.ts",
    "src/hooks/useHydrated.ts",
    "src/components/ClientOnly.tsx",
    "src/components/ClientOnly.rsc.ts",
    // A client reference in the rsc env, so it stays a module of its own
    "src/components/LoadingLayout.tsx",
  ],
  format: ["esm"],
  // The exports map resolves to dist/*.js, so output extensions must stay .js.
  fixedExtension: false,
  dts: {
    sourcemap: process.argv.slice(2).includes("--sourcemap"),
  },
});
