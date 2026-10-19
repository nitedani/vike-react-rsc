import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { createRoot, hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import { getPageElement } from "../integration/getPageElement";
import type { PagePayload } from "../types";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { callServer } from "./callServer";
import { Root, setCurrentPageContext, show } from "./page";
import { markRscOutputsStale } from "./rsc";

// Whether a page can render without a Flight, as in vike-react: under components: 'client', and always in dev
declare const __VIKE_REACT_RSC_CLIENT_DEFAULT__: boolean;

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
  if (!__VIKE_REACT_RSC_CLIENT_DEFAULT__ || container.innerHTML !== "") hydrateRoot(container, <Root page={page} />, { formState });
  else createRoot(container).render(<Root page={page} />);
};

async function getPagePayload(pageContext: PageContextClient): Promise<PagePayload> {
  const flight = pageContext.rscPayload && (await createFromReadableStream<PagePayload>(pageContext.rscPayload));
  // A page that renders as in vike-react has no Flight, or only what a form submitted before hydration returned
  if (!__VIKE_REACT_RSC_CLIENT_DEFAULT__ || flight?.root) return flight!;
  return { root: getPageElement(pageContext), formState: flight?.formState };
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
