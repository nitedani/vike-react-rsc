import vike from "vike/plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { compiled } from "vite-plugin-compiled-react";

export default defineConfig({
  plugins: [react(), vike(), compiled({ extract: true })],

  resolve: {
    noExternal: ["@compiled/react"],
    // The workspace link to vike-react-rsc resolves its own copy of vike, which would load the client runtime twice
    dedupe: ["vike"],
    alias: {
      "#": "/src",
    },
  },
});
