import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";

export default {
  extends: [vikeReactRsc],
  rsc: { staleTime: 10000 },
  meta: {
    // Has a value of its own in the server and rsc environments, see /pages/environments
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
