import { rmSync } from "node:fs";
import { testRun } from "./.testRun";
// Start from a cold Vite cache, as after a fresh clone or a dependency change
rmSync(new URL("./node_modules/.vite", import.meta.url), { recursive: true, force: true });
// Vite discovers what a linked package imports, as it isn't under node_modules, so without this the case an installed package hits can't happen; Vike includes jsx-dev-runtime in an install
process.env.VITE_CONFIG = "{optimizeDeps:{noDiscovery:true,include:['react/jsx-dev-runtime']}}";
testRun("pnpm run dev");
