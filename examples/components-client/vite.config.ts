import vike from "vike/plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vike()],
  resolve: {
    // pnpm can give the linked vike-react-rsc its own copy of vike, and the browser would load both
    // TODO: remove once https://github.com/universal-deploy/universal-deploy/pull/51 is released
    dedupe: ["vike"],
  },
});
