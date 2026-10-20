import type { Config } from "vike/types";

// E.g. two React apps on one page, whose useId() values must differ
export default {
  renderToStreamOptions: { streamOptions: { identifierPrefix: "vrr-" } },
} satisfies Config["react"];
