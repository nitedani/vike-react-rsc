import type { PageContextServer } from "vike/types";

// E.g. a tool that minifies the page's HTML, which needs all of it
export async function onAfterRenderHtml(pageContext: PageContextServer) {
  const html = await new Response(pageContext.pageHtmlStream!.readable).text();
  pageContext.pageHtmlStream = undefined;
  pageContext.pageHtmlString = `${html}<!-- Rendered to a string by +onAfterRenderHtml -->`;
}
