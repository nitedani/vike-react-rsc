import type { Config } from "vike/types";

export default {
  // testLoading(): the page streams, and its Loading still adds no Suspense boundary
  stream: true,
} satisfies Config;
