import type { PageContextServer } from "vike/types";

// E.g. a provider only the HTML's render needs
export function onBeforeRenderHtml(pageContext: PageContextServer) {
  pageContext.page = <section id="wrapper">{pageContext.page}</section>;
}
