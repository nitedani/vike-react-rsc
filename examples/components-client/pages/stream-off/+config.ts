import type { Config } from "vike/types";

export default {
  stream: false,
  // As vike-react-query 0.1.3 and older set it: the HTML still renders to a stream
  streamIsRequired: true,
} satisfies Config;
