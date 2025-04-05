import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/config.ts",
    "src/integration/client.ts",
    "src/integration/onBeforeRender.tsx",
    "src/integration/onRenderHtml.tsx",
    "src/integration/onRenderClient.tsx",
    "src/integration/onPageTransitionStart.tsx",
    "src/integration/serverActionMiddleware.ts",
    "src/register/browser.tsx",
    "src/register/server.tsx",
    "src/register/ssr.tsx",
    "src/runtime/server.tsx",
    "src/runtime/ssr.tsx",
    "src/hooks/usePageContext/usePageContext-client.tsx",
    "src/hooks/usePageContext/usePageContext-server.tsx",
  ],
  format: ["esm"],
  external: [/^virtual:/, /^vike-react-rsc\//],
  dts: {
    sourceMap: process.argv.slice(2).includes("--sourcemap"),
  },
  bundleDts: false,
}) as any;
