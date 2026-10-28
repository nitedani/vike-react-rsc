import type { Config } from "vike/types";

// Its +onBeforeRenderHtml throws, which would fail the pre-rendering
export default {
  prerender: false,
} satisfies Config;
