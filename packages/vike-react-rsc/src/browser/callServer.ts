import { createFromFetch, encodeReply } from "@vitejs/plugin-rsc/browser";
import { startTransition } from "react";
import { navigate } from "vike/client/router";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, UNKNOWN_ACTION_HEADER } from "../protocol";
import type { ActionPayload } from "../types";
import { getCurrentPageContext, showRoot } from "./page";
import { isRscLoad, markRscOutputsStale } from "./rsc";

/** React calls it for every server function the browser calls, rsc()'s included */
export async function callServer(id: string, args: unknown[]): Promise<unknown> {
  // rsc() sets it only during its synchronous call, so it must be read before the first await
  const changesData = !isRscLoad();
  const pageContext = getCurrentPageContext();
  const body = await encodeReply(args);
  const response = await fetch(pageContext.urlOriginal, {
    method: "POST",
    headers: { [ACTION_HEADER]: id, accept: FLIGHT_CONTENT_TYPE },
    body,
  });
  // Even when the answer is an error, the action may have run
  if (changesData) markRscOutputsStale();

  // The page loads again with the new build's actions; the call rejects below when it already did for this id
  if (response.headers.has(UNKNOWN_ACTION_HEADER) && claimReload(id)) {
    location.reload();
    // Never settles: the caller doesn't resume, the document goes away
    return new Promise(() => {});
  }
  const redirectTo = response.headers.get(REDIRECT_HEADER);
  if (redirectTo) {
    const url = new URL(redirectTo, location.href);
    // An HTTP redirect never runs e.g. a javascript: URL, but location.href would
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`[vike-react-rsc] The server action redirected to ${redirectTo}, which isn't an http(s) URL`);
    }
    if (url.origin !== location.origin) {
      window.location.href = url.href;
      // Never settles: the caller doesn't resume, the document goes away
      return new Promise(() => {});
    }
    // Settles after the navigation, so a form action's pending transition doesn't hold the new page back
    await navigate(url.pathname + url.search + url.hash);
    return undefined;
  }
  // E.g. a 404 page instead of the answer, Vike's HTML error page, or a static host
  const isFlight = response.headers.get("content-type")?.split(";")[0] === FLIGHT_CONTENT_TYPE.split(";")[0];
  if (!response.ok || !isFlight) throw new Error(`[vike-react-rsc] Server action failed: HTTP ${response.status}`);

  const { returnValue, root } = await createFromFetch<ActionPayload>(Promise.resolve(response));
  // The page changed since the call: this answer's page is out of date
  if (root && getCurrentPageContext() === pageContext) startTransition(() => showRoot(root));
  return returnValue;
}

// Once per action id and tab: an rsc() load that runs on mount would otherwise reload forever
function claimReload(id: string): boolean {
  const key = `vike-react-rsc:reloaded-for:${id}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    // Storage is blocked: no way to tell a first reload
    return false;
  }
}
