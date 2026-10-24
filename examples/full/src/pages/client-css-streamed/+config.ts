import type { Config } from "vike/types";

export default {
  // testClientCss(): the CSS link goes in the stream, before the Suspense boundary
  stream: true,
} satisfies Config;
