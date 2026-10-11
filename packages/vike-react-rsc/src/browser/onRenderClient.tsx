import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync } from "vike/types";
import type { PagePayload } from "../types";
import { callServer } from "./callServer";
import { Root, setCurrentPage, showPage } from "./page";
import { markRscCacheStale } from "./rsc";

setServerCallback(callServer);

// https://vike.dev/onRenderClient
export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  setCurrentPage(pageContext);
  if (pageContext.isHydration) {
    try {
      const payload = await createFromReadableStream<PagePayload>(pageContext.rscPayload);
      hydrateRoot(document.getElementById("root")!, <Root page={{ pageContext, payload }} />);
    } catch (err) {
      console.error("[Client] Hydration failed:", err);
    }
  } else if (pageContext.isClientSideNavigation) {
    try {
      const payload = await createFromReadableStream<PagePayload>(pageContext.rscPayload);
      showPage({ pageContext, payload });
    } catch (error) {
      console.error("[Client] Failed to navigate:", error);
    }
  }
};

if (import.meta.hot) {
  import.meta.hot.on("rsc:update", () => {
    markRscCacheStale();
    // The edit may have fixed the error that Vite's overlay shows
    document.querySelectorAll<Element & { close(): void }>("vite-error-overlay").forEach((overlay) => overlay.close());
    // Navigating to the current URL fetches the new payload
    const { pathname, search, hash } = location;
    navigate(pathname + search + hash, { keepScrollPosition: true });
  });
}
