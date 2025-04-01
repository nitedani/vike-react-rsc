import type { Config } from "vike/types";
import vikeServer from "vike-server/config";
import vikeReactRsc from "vike-react-rsc/config";

export default {
  extends: [vikeServer, vikeReactRsc],
  server: { entry: "./src/server.ts", standalone: true },
} satisfies Config;
