import vike from "vike/plugin";
import vikeRscPlugin from "./src/vite-plugin-vike-rsc";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vikeRscPlugin(), vike()],
  resolve: {
    alias: {
      "#": "/src",
    },
  },
});
