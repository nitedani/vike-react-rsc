import type { PageContextClient } from "vike/types";

// It throws only on hydration, so the page's first render fails
export function onAfterRenderClient(pageContext: PageContextClient) {
  if (pageContext.isHydration) throw new Error("A page's +onAfterRenderClient failed on demand");
}
