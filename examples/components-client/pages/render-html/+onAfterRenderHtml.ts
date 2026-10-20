import type { PageContextServer } from "vike/types";

// E.g. a store's state once the page rendered, as vike-react-redux dehydrates it
export function onAfterRenderHtml(pageContext: PageContextServer) {
  pageContext.headersResponse.set("x-store-rendered-by", pageContext.store!.renderedBy.join());
}
