import type { Config } from "vike/types";

// E.g. an app's options for its streaming pages, on a page that doesn't stream: vike-react renders it with renderToString()
export default {
  renderToStreamOptions: { streamOptions: { identifierPrefix: "vrr-stream-" } },
} satisfies Config["react"];
