import type { PageContextClient } from "vike/types";

// E.g. a testing tool that waits for the page
export function onAfterRenderClient(pageContext: PageContextClient) {
  const renders = ((window as { afterRenders?: unknown[] }).afterRenders ??= []);
  renders.push({ isHydration: pageContext.isHydration, shown: document.getElementById("after-render")?.textContent ?? null });
}
