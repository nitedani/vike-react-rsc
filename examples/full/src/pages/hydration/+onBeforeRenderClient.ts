import { navigate } from "vike/client/router";
import type { PageContextClient } from "vike/types";

// Starts a navigation before React commits the hydration; the flag tells a client navigation from a page load
export function onBeforeRenderClient(pageContext: PageContextClient) {
  if (!pageContext.isHydration) return;
  (window as { navigatedDuringHydration?: boolean }).navigatedDuringHydration = true;
  void navigate("/");
}
