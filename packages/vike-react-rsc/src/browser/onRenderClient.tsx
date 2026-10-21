import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { hydrateRoot } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import { getHeadSetting } from "../integration/getHeadSetting";
import type { PagePayload } from "../types";
import { callServer } from "./callServer";
import { Root, show, type Head } from "./page";
import { markRscOutputsStale } from "./rsc";

setServerCallback(callServer);

export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const { root, formState } = await createFromReadableStream<PagePayload>(pageContext.rscPayload);
  // Evaluated before the page shows, so a setting that throws reaches Vike; the HTML has the hydrated page's
  const head = pageContext.isHydration ? undefined : getHead(pageContext);
  const page = { pageContext, root, head };
  show(page);
  if (pageContext.isHydration) hydrateRoot(document.getElementById("root")!, <Root page={page} />, { formState });
};

function getHead(pageContext: PageContextClient): Head {
  return [
    getHeadSetting<string | null>("title", pageContext),
    getHeadSetting<string | null>("lang", pageContext),
    getHeadSetting<string | null>("description", pageContext),
  ];
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
