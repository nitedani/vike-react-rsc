import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { createRoot, hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import { getPageElement } from "../integration/getPageElement";
import { rendersFlight } from "../rendersFlight";
import type { PagePayload } from "../types";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { callServer } from "./callServer";
import { Root, setCurrentPageContext, show } from "./page";
import { markRscOutputsStale } from "./rsc";

setServerCallback(callServer);

export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  setCurrentPageContext(pageContext);
  // Use case:
  // - Store hydration https://github.com/vikejs/vike-react/issues/110
  await callCumulativeHooks(pageContext.config.onBeforeRenderClient, pageContext);
  const { root, formState } = await getPagePayload(pageContext);
  const page = { pageContext, root };
  show(page);
  if (!pageContext.isHydration) return;
  const container = document.getElementById("root")!;
  // Whether the page was [Server-Side Rendered](https://vike.dev/ssr).
  if (container.innerHTML !== "") hydrateRoot(container, <Root page={page} />, { formState });
  else createRoot(container).render(<Root page={page} />);
};

function getPagePayload(pageContext: PageContextClient): Promise<PagePayload> | PagePayload {
  if (rendersFlight(pageContext)) return createFromReadableStream<PagePayload>(pageContext.rscPayload!);
  return { root: getPageElement(pageContext) };
}

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
