import { createFromFetch, encodeReply } from "@vitejs/plugin-rsc/browser";
import { startTransition } from "react";
import { navigate } from "vike/client/router";
import type { PageContextClient } from "vike/types";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, UNKNOWN_ACTION_HEADER } from "../protocol";
import { getRedirectUrl } from "../redirect";
import type { ActionPayload } from "../types";
import { markAnswered } from "./AbortBoundary";
import { getCurrentPageContext, hasUserActed, showRoot } from "./page";
import { isRscLoad, markRscOutputsStale } from "./rsc";

/** React calls it for every server function the browser calls, rsc()'s included */
export async function callServer(id: string, args: unknown[]): Promise<unknown> {
  // rsc() sets it only during its synchronous call, so it must be read before the first await
  const changesData = !isRscLoad();
  const pageContext = getCurrentPageContext();
  // Read at the call: a redirect it answers keeps the page in history only if the user acted on the page first
  const keepsPage = hasUserActed();
  const response = await postAction(pageContext.urlOriginal, id, args);
  // Even when the answer is an error, the action may have run
  if (changesData) markRscOutputsStale();

  // The page loads again with the new build's actions; the call rejects below when it already did for this id
  if (response.headers.has(UNKNOWN_ACTION_HEADER) && claimReload(id)) return leavePage(() => location.reload());
  const redirectTo = response.headers.get(REDIRECT_HEADER);
  if (redirectTo) return followRedirect(redirectTo, keepsPage);
  return readAnswer(response, pageContext, keepsPage);
}

async function postAction(url: string, id: string, args: unknown[]): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { [ACTION_HEADER]: id, accept: FLIGHT_CONTENT_TYPE },
    body: await encodeReply(args),
  });
}

async function followRedirect(redirectTo: string, keepsPage: boolean): Promise<undefined> {
  const url = getRedirectUrl(redirectTo, location.href);
  if (!url) throw new Error(`[vike-react-rsc] The server action redirected to ${redirectTo}, which isn't an http(s) URL`);
  if (url.origin !== location.origin) return leavePage(() => location[keepsPage ? "assign" : "replace"](url.href));
  // Settles after the navigation, so a form action's pending transition doesn't hold the new page back
  await navigate(url.pathname + url.search + url.hash, { overwriteLastHistoryEntry: !keepsPage });
  return undefined;
}

async function readAnswer(response: Response, pageContext: PageContextClient, keepsPage: boolean): Promise<unknown> {
  // E.g. a 404 page instead of the answer, Vike's HTML error page, or a static host
  const isFlight = response.headers.get("content-type")?.split(";")[0] === FLIGHT_CONTENT_TYPE.split(";")[0];
  if (!response.ok || !isFlight) throw new Error(`[vike-react-rsc] Server action failed: HTTP ${response.status}`);
  const { returnValue, root } = await createFromFetch<ActionPayload>(Promise.resolve(response));
  if (keepsPage) markAnswered(pageContext);
  // The page changed since the call: this answer's page is out of date
  if (root && getCurrentPageContext() === pageContext) startTransition(() => showRoot(root));
  return returnValue;
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
