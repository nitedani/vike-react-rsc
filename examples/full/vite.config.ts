import vike from "vike/plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { compiled } from "vite-plugin-compiled-react";

export default defineConfig({
  plugins: [react(), vike(), compiled({ extract: true })],

  resolve: {
    noExternal: ["@compiled/react"],
    alias: {
      "#": "/src",
    },
  },
});
