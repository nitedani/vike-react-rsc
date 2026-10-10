import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync } from "vike/types";
import type { RscPayload } from "../types";
import { callServer } from "./callServer";
import { Root, setCurrentPage, showPage } from "./page";
import { markRscCacheStale } from "./rsc";

setServerCallback(callServer);

// https://vike.dev/onRenderClient
export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  setCurrentPage(pageContext);
  if (pageContext.isHydration) {
    try {
      const container = document.getElementById("root");
      if (!container) {
        console.error("[Client] Container #root not found!");
        return;
      }
      if (!pageContext.rscPayload) throw new Error("[vike-react-rsc] pageContext.rscPayload is missing");
      const payload = await createFromReadableStream<RscPayload>(pageContext.rscPayload);
      hydrateRoot(container, <Root page={{ pageContext, payload }} />, { formState: payload.formState });
    } catch (err) {
      console.error("[Client] Hydration failed:", err);
    }
  } else if (pageContext.isClientSideNavigation) {
    try {
      if (!pageContext.rscPayload) throw new Error("[vike-react-rsc] pageContext.rscPayload is missing");
      const payload = await createFromReadableStream<RscPayload>(pageContext.rscPayload);
      showPage({ pageContext, payload });
    } catch (error) {
      console.error("[Client] Failed to navigate:", error);
    }
  }
};

if (import.meta.hot) {
  import.meta.hot.on("rsc:update", () => {
    markRscCacheStale();
    // Navigating to the current URL fetches the new payload
    const { pathname, search, hash } = location;
    navigate(pathname + search + hash, { keepScrollPosition: true });
  });
}
