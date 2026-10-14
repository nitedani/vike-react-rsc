import vike from "vike/plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { compiled } from "vite-plugin-compiled-react";

export default defineConfig({
  plugins: [react(), vike(), compiled()],

  resolve: {
    noExternal: ["@compiled/react"],
    // pnpm can give the linked vike-react-rsc its own copy of vike, and the browser would load both
    dedupe: ["vike"],
    alias: {
      "#": "/src",
    },
  },
});
