import { createFromFetch, encodeReply } from "@vitejs/plugin-rsc/browser";
import { startTransition } from "react";
import { navigate } from "vike/client/router";
import type { PageContext, PageContextClient } from "vike/types";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, UNKNOWN_ACTION_HEADER } from "../protocol";
import { getRedirectUrl } from "../redirect";
import type { ActionPayload } from "../types";
import { getCurrentPageContext, showRoot } from "./page";
import { dropRscOutputs, isRscLoad, markRscOutputsStale } from "./rsc";

// The pages a server action answered
const answeredPages = new WeakSet<PageContext>();

/** React calls it for every server function the browser calls, rsc()'s included */
export async function callServer(id: string, args: unknown[]): Promise<unknown> {
  // rsc() sets it only during its synchronous call, so it must be read before the first await
  const isAction = !isRscLoad();
  const pageContext = getCurrentPageContext();
  const response = await postAction(pageContext.urlOriginal, id, args);
  // Even when the answer is an error, the action may have run
  if (isAction) markRscOutputsStale();

  // The page loads again with the new build's actions; the call rejects below when it already did for this id
  if (response.headers.has(UNKNOWN_ACTION_HEADER) && claimReload(id)) return leavePage(() => location.reload());
  const redirectTo = response.headers.get(REDIRECT_HEADER);
  // As in Next.js, an action's redirect keeps the page in history, and a server component's replaces it, as an HTTP redirect does
  if (redirectTo) return followRedirect(redirectTo, isAction);
  return readAnswer(response, pageContext, isAction);
}

async function postAction(url: string, id: string, args: unknown[]): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { [ACTION_HEADER]: id, accept: FLIGHT_CONTENT_TYPE },
    body: await encodeReply(args),
  });
}

/** Follows a redirect the server sent: `keepsPage` keeps the page in history */
export function followRedirect(redirectTo: string, keepsPage: boolean): Promise<void> {
  const url = getRedirectUrl(redirectTo, location.href);
  if (!url) throw new Error(`[vike-react-rsc] The server redirected to ${redirectTo}, which isn't an http(s) URL`);
  if (url.origin !== location.origin) return leavePage(() => location[keepsPage ? "assign" : "replace"](url.href));
  // An rsc() output that throws redirect(), loaded or still loading, would throw it again after Back
  dropRscOutputs();
  // Settles after the navigation, so a form action's pending transition doesn't hold the new page back
  return navigate(url.pathname + url.search + url.hash, { overwriteLastHistoryEntry: !keepsPage });
}

async function readAnswer(response: Response, pageContext: PageContextClient, isAction: boolean): Promise<unknown> {
  // E.g. a 404 page instead of the answer, Vike's HTML error page, or a static host
  const isFlight = response.headers.get("content-type")?.split(";")[0] === FLIGHT_CONTENT_TYPE.split(";")[0];
  if (!response.ok || !isFlight) throw new Error(`[vike-react-rsc] Server action failed: HTTP ${response.status}`);
  const { returnValue, root } = await createFromFetch<ActionPayload>(Promise.resolve(response));
  if (isAction) answeredPages.add(pageContext);
  // The page changed since the call: this answer's page is out of date
  if (root && getCurrentPageContext() === pageContext) startTransition(() => showRoot(root));
  return returnValue;
}

/** A redirect thrown in what a server action's rerender() sent keeps the page in history, as the action's own redirect does */
export function wasAnswered(pageContext: PageContext): boolean {
  return answeredPages.has(pageContext);
}

// Never settles: the caller doesn't resume, the document goes away
function leavePage(leave: () => void): Promise<never> {
  leave();
  return new Promise(() => {});
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
