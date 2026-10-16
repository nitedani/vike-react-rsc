import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync } from "vike/types";
import { getAbort } from "../abort";
import type { PagePayload } from "../types";
import { callServer } from "./callServer";
import { Root, setCurrentPageContext, show } from "./page";
import { markRscOutputsStale } from "./rsc";

setServerCallback(callServer);

export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  setCurrentPageContext(pageContext);
  const { root, formState } = await createFromReadableStream<PagePayload>(pageContext.rscPayload);
  const page = { pageContext, root };
  show(page);
  if (!pageContext.isHydration) return;
  hydrateRoot(document.getElementById("root")!, <Root page={page} />, {
    formState,
    // AbortBoundary acts on a server component's `throw redirect()`: it isn't an error to report
    onCaughtError: (error, errorInfo) => {
      if (!getAbort(error)) console.error(error, errorInfo.componentStack);
    },
  });
};

if (import.meta.hot) {
  // plugin-rsc's signal that a server component changed
  import.meta.hot.on("rsc:update", () => {
    markRscOutputsStale();
    // The change may fix the error Vite's overlay shows
    for (const overlay of document.querySelectorAll("vite-error-overlay")) (overlay as Element & { close(): void }).close();
    // Vike fetches the page's pageContext again, with the new Flight
    void navigate(location.href, { keepScrollPosition: true });
  });
}
