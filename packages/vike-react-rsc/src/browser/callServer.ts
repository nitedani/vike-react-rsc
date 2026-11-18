import { createFromFetch, encodeReply } from "@vitejs/plugin-rsc/browser";
import { startTransition } from "react";
import { readPageContextJson } from "vike/__internal/client";
import { navigate } from "vike/client/router";
import type { PageContextClient } from "vike/types";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, RSC_LOAD_HEADER, UNKNOWN_ACTION_HEADER } from "../protocol";
import { getRedirectUrl } from "../redirect";
import type { ActionPayload } from "../rsc/runtime";
import { getCallKind, type CallKind } from "./callKind";
import { getCurrentPageContext, showRoot } from "./page";
import { dropRscOutputs, markRscOutputsStale } from "./rsc";

/** How a redirect changes history: "push" keeps the page, "replace" replaces it, as an HTTP redirect does */
export type RedirectHistory = "push" | "replace";

/** React calls it for every server function the browser calls, rsc()'s included */
export async function callServer(id: string, args: unknown[]): Promise<unknown> {
  // Before the first await: rsc() sets it only during its synchronous call
  const kind = getCallKind();
  const pageContext = getCurrentPageContext();
  const response = await postAction(pageContext.urlOriginal, id, args, kind);
  // Even when the answer is an error, the action may have run
  if (kind === "action") markRscOutputsStale();

  // The page loads again with the new build's actions; the call rejects below when it already did for this id
  if (response.headers.has(UNKNOWN_ACTION_HEADER) && claimReload(id)) return leavePage(() => location.reload());
  const redirectTo = response.headers.get(REDIRECT_HEADER);
  // As in Next.js, an action's redirect keeps the page in history, and a server component's replaces it, as an HTTP redirect does
  if (redirectTo) return followRedirect(redirectTo, getRedirectHistory(kind));
  return readAnswer(response, pageContext, kind);
}

function getRedirectHistory(kind: CallKind): RedirectHistory {
  return kind === "action" ? "push" : "replace";
}

async function postAction(url: string, id: string, args: unknown[], kind: CallKind): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { [ACTION_HEADER]: id, accept: FLIGHT_CONTENT_TYPE, ...(kind === "componentLoad" && { [RSC_LOAD_HEADER]: "1" }) },
    body: await encodeReply(args),
  });
}

/** Follows a redirect the server sent */
export function followRedirect(redirectTo: string, history: RedirectHistory): Promise<void> {
  // A redirect that replaces the page can come from an rsc() output, loaded or still loading, which would throw it again after Back
  if (history === "replace") dropRscOutputs();
  const url = getRedirectUrl(redirectTo, location.href);
  if (!url) throw new Error(`[vike-react-rsc] The server redirected to ${redirectTo}, which isn't an http(s) URL`);
  if (url.origin !== location.origin) return leavePage(() => location[history === "push" ? "assign" : "replace"](url.href));
  // Settles after the navigation, so a form action's pending transition doesn't hold the new page back
  return navigate(url.pathname + url.search + url.hash, { overwriteLastHistoryEntry: history === "replace" });
}

async function readAnswer(response: Response, pageContext: PageContextClient, kind: CallKind): Promise<unknown> {
  // E.g. a 404 page instead of the answer, Vike's HTML error page, or a static host
  const isFlight = response.headers.get("content-type")?.split(";")[0] === FLIGHT_CONTENT_TYPE.split(";")[0];
  if (!response.ok || !isFlight) throw new Error(`[vike-react-rsc] Server action failed: HTTP ${response.status}`);
  const payload = await createFromFetch<ActionPayload>(Promise.resolve(response));
  if ("root" in payload) {
    const { json, keys, headSettings } = payload.passedToClient;
    const passed = (await readPageContextJson(new Response(json), pageContext.abortSignal)) as Record<string, unknown>;
    // The page changed since the call: this answer's page is out of date
    if (getCurrentPageContext() === pageContext) {
      startTransition(() => showRoot({ root: payload.root, passed, keys, redirectHistory: getRedirectHistory(kind), headSettings }));
    }
  }
  return payload.returnValue;
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
