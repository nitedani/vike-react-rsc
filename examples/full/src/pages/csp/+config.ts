import type { Config } from "vike/types";

// https://vike.dev/csp
export default {
  csp: { nonce: true },
  // testCspNonce(): React's inline scripts of a streamed Suspense boundary carry the nonce too
  stream: true,
} satisfies Config;
