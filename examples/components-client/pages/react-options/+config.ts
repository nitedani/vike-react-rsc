import type { Config } from "vike/types";

export default {
  // Its +react's renderToStreamOptions apply only to a page that streams, as in vike-react
  stream: true,
} satisfies Config;
