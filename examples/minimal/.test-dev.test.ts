import { rmSync } from "node:fs";
import { testRun } from "./.testRun";
// Start from a cold Vite cache, as after a fresh clone or a dependency change
rmSync(new URL("./node_modules/.vite", import.meta.url), { recursive: true, force: true });
// A linked package isn't under node_modules, so without this the case an installed package hits can't happen
process.env.VITE_CONFIG = "{resolve:{preserveSymlinks:true}}";
testRun("pnpm run dev");
