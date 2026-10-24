import type { Config } from "vike/types";

export default {
  // The HTML streams, so the title behind Suspense renders once the <head> was sent
  stream: true,
} satisfies Config;
