import vike from "vike/plugin";
import vikeRscPluginMinimal from "./src/vite-plugin-vike-rsc-minimal";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vikeRscPluginMinimal(), vike()],
});
