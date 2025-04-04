import vike from "vike/plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vike()],
  resolve: {
    alias: {
      "#": "/src",
    },
  },
});
