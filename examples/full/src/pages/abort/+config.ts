import type { Config } from "vike/types";

// Vike refuses a throw redirect() or throw render() while pre-rendering
export default {
  prerender: false,
} satisfies Config;
