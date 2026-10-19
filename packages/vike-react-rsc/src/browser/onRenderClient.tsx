import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { createRoot, hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import { getPageElement } from "../integration/getPageElement";
import { findServerComponent } from "../rendersFlight";
import type { PagePayload } from "../types";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { callServer } from "./callServer";
import { Root, setCurrentPageContext, show } from "./page";
import { markRscOutputsStale } from "./rsc";

// Whether a page can render without a Flight, as in vike-react: under components: 'client', and always in dev
declare const __VIKE_REACT_RSC_CLIENT_DEFAULT__: boolean;

setServerCallback(callServer);

export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  if (__VIKE_REACT_RSC_CLIENT_DEFAULT__) assertRendersInBrowser(pageContext);
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
  if (flight?.root) return flight;
  // A page that renders as in vike-react has no Flight, or only what a form submitted before hydration returned. So has
  // the error page after an error in the browser, whatever its components.
  if (!__VIKE_REACT_RSC_CLIENT_DEFAULT__ || !pageContext.config.Page) throw cannotRenderInBrowser(pageContext, "components: 'server' makes it a server component");
  const serverComponent = findServerComponent(pageContext);
  if (serverComponent) throw cannotRenderInBrowser(pageContext, `${serverComponent.file} starts with "use server component"`);
  return { root: getPageElement(pageContext), formState: flight?.formState };
}

function cannotRenderInBrowser(pageContext: PageContextClient, cause: string): Error {
  return new Error(`[vike-react-rsc] The page ${pageContext.pageId} has to render in the browser, e.g. the error page after an error there, but ${cause}, which renders only on the server`);
}

// A page with ssr: false renders only in the browser, where a server component can't render
function assertRendersInBrowser(pageContext: PageContextClient) {
  const serverComponent = pageContext.config.ssr === false && findServerComponent(pageContext);
  if (!serverComponent) return;
  throw new Error(
    `[vike-react-rsc] ${serverComponent.file} starts with "use server component", so it renders on the server, but the page ${pageContext.pageId} sets ssr to false, so it renders only in the browser: remove "use server component" or ssr: false`
  );
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
