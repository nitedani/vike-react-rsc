import type { Config } from "vike/types";
import vikeServer from "vike-server/config";

export default {
  passToClient: ["rscPayloadString"],
  hydrationCanBeAborted: true,
  extends: [vikeServer],
  server: "./src/server.ts",
  clientRouting: true,
} satisfies Config;
