import type { Config } from "vike/types";

export default {
  // As in vike-react, +onAfterRenderHtml gets pageContext.pageHtmlStream only on a page that streams
  stream: true,
} satisfies Config;
