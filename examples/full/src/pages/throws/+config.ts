import type { Config } from "vike/types";

// Its server component throws, which would fail the pre-rendering
export default {
  prerender: false,
} satisfies Config;
