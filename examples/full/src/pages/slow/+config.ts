import type { Config } from "vike/types";

export default {
  // testClientDisconnect(): a client leaves before the Suspense boundary resolves
  stream: true,
} satisfies Config;
