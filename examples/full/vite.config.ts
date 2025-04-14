import vike from "vike/plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { compiled } from "vite-plugin-compiled-react";
import standaloner from "standaloner/vite";

export default defineConfig({
  plugins: [react(), vike(), compiled({ extract: true }), standaloner()],

  resolve: {
    noExternal: ["@compiled/react"],
    alias: {
      "#": "/src",
    },
  },
});
