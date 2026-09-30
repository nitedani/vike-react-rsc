import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";

export default {
  extends: [vikeReactRsc],
  rsc: { staleTime: 10000 },
} satisfies Config;
