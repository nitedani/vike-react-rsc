import type { PageContextServer } from "vike/types";

// E.g. a tool that transforms the page's HTML, and awaits something first
export async function onAfterRenderHtml(pageContext: PageContextServer) {
  await new Promise((resolve) => setTimeout(resolve, 800));
  pageContext.headersResponse.set("x-page-html", pageContext.pageHtmlStream ? "stream" : "none");
}
