import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";
import vikeCloudflare from "vike-cloudflare/config";

export default {
  extends: [vikeCloudflare, vikeReactRsc],
  server: { entry: "./src/server.ts" },
} satisfies Config;
