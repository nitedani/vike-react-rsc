import type { Config } from "vike/types";

export default {
  // The HTML exists, as a stream, when +onAfterRenderHtml runs
  stream: true,
  // Its +onAfterRenderHtml throws, which would fail the pre-rendering
  prerender: false,
} satisfies Config;
