import { createFromFetch, encodeReply } from "@vitejs/plugin-rsc/browser";
import { startTransition } from "react";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER } from "../protocol";
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

  const redirectTo = response.headers.get(REDIRECT_HEADER);
  if (redirectTo) {
    const url = new URL(redirectTo, location.href);
    // An HTTP redirect never runs e.g. a javascript: URL, but location.href would
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`[vike-react-rsc] The server action redirected to ${redirectTo}, which isn't an http(s) URL`);
    }
    window.location.href = url.href;
    // Never settles: the caller doesn't resume, the document goes away
    return new Promise(() => {});
  }
  // E.g. a 404 page instead of the answer, Vike's HTML error page, or a static host
  const isFlight = response.headers.get("content-type")?.split(";")[0] === "text/x-component";
  if (!response.ok || !isFlight) throw new Error(`[vike-react-rsc] Server action failed: HTTP ${response.status}`);

  const { returnValue, root } = await createFromFetch<ActionPayload>(Promise.resolve(response));
  // The page changed since the call: this answer's page is out of date
  if (root && getCurrentPageContext() === pageContext) startTransition(() => showRoot(root));
  return returnValue;
}
