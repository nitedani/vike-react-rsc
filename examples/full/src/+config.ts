import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";
import vikeCloudflare from "vike-server/config";


export default {
  extends: [vikeCloudflare, vikeReactRsc],
  server: { entry: "./src/server.ts" },
  rsc: { staleTime: 10000 },
} satisfies Config;
