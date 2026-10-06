import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";

export default {
  extends: [vikeReactRsc],
  rsc: { staleTime: 10000 },
  meta: {
    // Loaded in the rsc environment only: the server reads it at pageContext.environments.rsc.config, see /pages/environments
    greeting: { env: { rsc: true } },
  },
} satisfies Config;

declare global {
  namespace Vike {
    interface Config {
      greeting?: string;
    }
  }
}
