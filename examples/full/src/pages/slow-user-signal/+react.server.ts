import type { Config } from "vike/types";

// A function, so that each request gets its own signal
export default (() => ({
  renderToStreamOptions: {
    signal: AbortSignal.timeout(200),
    // E.g. an app's own CSP nonce, where Vike sets none
    streamOptions: { nonce: "app-nonce" },
  },
})) satisfies Config["react"];
