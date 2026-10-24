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
    "src/hooks/useConfig/useConfig-server.ts",
    "src/hooks/useConfig/useConfig-client.ts",
    "src/components/ClientOnly.tsx",
    "src/components/ClientOnly.rsc.ts",
    "src/components/Config/Config-server.ts",
    "src/components/Config/Config-client.ts",
    "src/components/Config/Config.rsc.ts",
    "src/components/Head/Head-server.ts",
    "src/components/Head/Head-client.ts",
    "src/components/Head/Head.rsc.ts",
    // A client reference in the rsc env, so it stays a module of its own
    "src/components/LoadingBoundary.tsx",
  ],
  format: ["esm"],
  // Kept as imports. getPageElement() imports LoadingBoundary, a client reference in the rsc env. Config.rsc.ts and
  // Head.rsc.ts re-export vike-react-rsc/Config and /Head, which the HTML render and the browser resolve to their own file.
  deps: { neverBundle: ["vike-react-rsc/__internal/LoadingBoundary", "vike-react-rsc/Config", "vike-react-rsc/Head"] },
  // The exports map resolves to dist/*.js, so output extensions must stay .js.
  fixedExtension: false,
  dts: {
    sourcemap: process.argv.slice(2).includes("--sourcemap"),
  },
});
