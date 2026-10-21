import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { createRoot, hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import { getPageElement } from "../integration/getPageElement";
import { findServerComponent } from "../rendersFlight";
import type { PagePayload } from "../types";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { onCaughtError } from "./AbortBoundary";
import { callServer } from "./callServer";
import { onUncaughtError, rendered, Root, setCurrentPageContext, setReactRoot, show } from "./page";
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
  // As vike-react's: Vike ends the navigation once React shows the page, and renders the error page if React throws on
  // it. Not on hydration, whose onHydrationEnd() may navigate before React commits.
  if (!pageContext.isHydration) {
    // Or until the user navigates elsewhere: Vike runs the next page's onRenderClient() only once this one ends
    // TODO: require the Vike release that includes https://github.com/vikejs/vike/pull/3641, which adds pageContext.abortSignal
    await rendered(pageContext.abortSignal);
    if (pageContext.abortSignal.aborted) return;
    // Use cases:
    // - Custom user settings: https://vike.dev/head-tags#custom-settings
    // - Testing tools: https://github.com/vikejs/vike-react/issues/95
    await callCumulativeHooks(pageContext.config.onAfterRenderClient, pageContext);
    return;
  }
  const container = document.getElementById("root")!;
  // Whether the page was [Server-Side Rendered](https://vike.dev/ssr).
  if ((!__VIKE_REACT_RSC_CLIENT_DEFAULT__ && pageContext.config.ssr !== false) || container.innerHTML !== "") {
    setReactRoot(hydrateRoot(container, <Root page={page} />, { formState, onCaughtError, onUncaughtError }));
  } else {
    const reactRoot = createRoot(container, { onCaughtError, onUncaughtError });
    setReactRoot(reactRoot);
    reactRoot.render(<Root page={page} />);
  }
  // Once React hydrates, which onRenderClient() doesn't wait for: so after +onHydrationEnd, and a hook's error is an unhandled
  // rejection, not the error page. onUncaughtError() logs an error React throws instead.
  // TODO: await it, as vike-react does, once https://github.com/vikejs/vike/pull/3641 is released
  void rendered().then(() => callCumulativeHooks(pageContext.config.onAfterRenderClient, pageContext), () => {});
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
