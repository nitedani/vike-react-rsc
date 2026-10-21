import type { Config } from "vike/types";

// null removes what the root +config sets, and the defaults
export default {
  title: null,
  description: null,
  lang: null,
  viewport: null,
} satisfies Config;
