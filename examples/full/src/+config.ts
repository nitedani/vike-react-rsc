import type { Config } from "vike/types";
import vikeServer from "vike-server/config";
import vikeReactRsc from "vike-react-rsc/config";

export default {
  extends: [vikeServer, vikeReactRsc],
  server: "./src/server.ts",
} satisfies Config;
