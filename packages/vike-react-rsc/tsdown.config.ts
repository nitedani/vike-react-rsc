import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/config.ts",
    "src/integration/client.ts",
    "src/integration/onBeforeRender.tsx",
    "src/integration/onRenderHtml.tsx",
    "src/integration/onRenderClient.tsx",
    "src/register/browser.tsx",
    "src/register/server.tsx",
    "src/register/ssr.tsx",
    "src/runtime/server.tsx",
  ],
  format: ["esm"],
  external: [/^virtual:/, /^vike-react-rsc\//],
  dts: {
    sourceMap: process.argv.slice(2).includes("--sourcemap"),
  },
  bundleDts: false,
}) as any;
