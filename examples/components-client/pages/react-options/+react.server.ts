import type { Config } from "vike/types";

export default {
  renderToStreamOptions: {
    // E.g. two React apps on one page, whose useId() values must differ
    streamOptions: { identifierPrefix: "vrr-" },
    // E.g. an app moved from vike-react, which renders to a Node stream with it
    webStream: false,
  },
} satisfies Config["react"];
