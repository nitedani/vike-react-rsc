import type { PageContextClient } from "vike/types";

// E.g. a store's hydration
export function onBeforeRenderClient(pageContext: PageContextClient) {
  (window as { renderedPath?: string }).renderedPath = pageContext.urlPathname;
}
