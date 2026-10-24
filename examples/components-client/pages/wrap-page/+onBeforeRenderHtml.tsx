import type { PageContextServer } from "vike/types";

// Only in the HTML, for its test: a real wrapper must render the same in the browser, or hydration fails
export function onBeforeRenderHtml(pageContext: PageContextServer) {
  pageContext.page = <section id="wrapper">{pageContext.page}</section>;
}
