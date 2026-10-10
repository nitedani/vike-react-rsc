import { createFromFetch, encodeReply } from "@vitejs/plugin-rsc/browser";
import { startTransition } from "react";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER } from "../protocol";
import type { ActionPayload, ErrorPayload } from "../types";
import { getCurrentPage, isCurrent, showPayload } from "./page";
import { isRscLoading, markRscCacheStale } from "./rsc";

/** React calls it for every server action, rsc() loads included */
export async function callServer(id: string, args: unknown[]): Promise<unknown> {
  const isRscLoad = isRscLoading();
  const pageContext = getCurrentPage();
  if (!pageContext) throw new Error("Missing page context");
  const response = fetch(pageContext.urlOriginal, {
    method: "POST",
    headers: { accept: FLIGHT_CONTENT_TYPE, [ACTION_HEADER]: id },
    body: await encodeReply(args),
  });
  // A throw redirect() in the action, guard() or data() (ssr/action.ts)
  const redirect = (await response).headers.get(REDIRECT_HEADER);
  if (redirect) {
    window.location.assign(redirect);
    // Keep the caller pending while the browser replaces this document
    return new Promise<never>(() => {});
  }
  const payload = await createFromFetch<ActionPayload | ErrorPayload>(response);
  if ("error" in payload) throw new Error(`[vike-react-rsc] RSC request failed: ${payload.error.reason}`);
  const { root } = payload;
  // The user navigated away meanwhile: the payload belongs to the old page
  if (root && isCurrent(pageContext)) startTransition(() => showPayload({ root }));
  if (!isRscLoad) markRscCacheStale();
  return payload.returnValue;
}
