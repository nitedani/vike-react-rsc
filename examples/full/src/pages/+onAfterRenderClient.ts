import type { PageContextClient } from "vike/types";

// testPendingPage() and testNavigationKeepsPage(): the pages whose +onAfterRenderClient ran
export function onAfterRenderClient(pageContext: PageContextClient) {
  const afterRenders = ((window as { afterRenders?: string[] }).afterRenders ??= []);
  afterRenders.push(pageContext.isHydration ? `${pageContext.urlPathname} (hydration)` : pageContext.urlPathname);
}
