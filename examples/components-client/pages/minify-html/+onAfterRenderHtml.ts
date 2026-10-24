import type { PageContextServer } from "vike/types";

// vike.dev/onAfterRenderHtml's example
export function onAfterRenderHtml(pageContext: PageContextServer) {
  pageContext.pageHtmlString = minifyHtml(pageContext.pageHtmlString!);
}

function minifyHtml(html: string) {
  return html.replace(/\s+/g, " ");
}
