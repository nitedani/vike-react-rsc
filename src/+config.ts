import type { Config } from "vike/types";
import vikeServer from "vike-server/config";

export default {
  passToClient: ["rscPayloadString"],
  extends: [vikeServer],
  server: "./src/server.ts",
  clientRouting: true,
} satisfies Config;
