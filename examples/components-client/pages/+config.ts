import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";

// A vike-react app that moves to server components one file at a time
export default {
  extends: [vikeReactRsc],
  components: "client",
  server: true,
} satisfies Config;
