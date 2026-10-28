import type { Config } from "vike/types";

export default {
  // Its films load in 1 to 6 seconds, each in its own Suspense boundary
  stream: true,
} satisfies Config;
