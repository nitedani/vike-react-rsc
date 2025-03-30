import type { Config } from "vike/types";
import vikeServer from "vike-server/config";

export default {
  extends: [vikeServer],
  server: "./src/server.ts",
} satisfies Config;
