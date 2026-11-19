import { navigate } from "vike/client/router";
import type { PageContextClient } from "vike/types";
import { getRedirectUrl } from "../redirect";
import { getShared } from "../shared";
import { dropRscOutputs } from "./rsc";

/** How a redirect changes history: "push" keeps the page, "replace" replaces it, as an HTTP redirect does */
export type RedirectHistory = "push" | "replace";

// One for every copy of this file: after an edit, Vite can load the next page's entry with a new copy
const shared = getShared(
  "navigation",
  (): {
    // The pageContext of the page Vike showed, which actions' answers don't replace: actions call its URL, and their answers apply only while it's current
    current?: PageContextClient;
    // The navigation waiting until React shows its page, or throws on it
    rendering?: { resolve: () => void; reject: (error: unknown) => void };
  } => ({})
);

export function setCurrentPageContext(pageContext: PageContextClient): void {
  shared.current = pageContext;
}

export function getCurrentPageContext(): PageContextClient {
  return shared.current!;
}

/** Resolves once React shows what show() was last given or `abortSignal` aborts, or rejects with the error React throws while rendering it */
export async function rendered(abortSignal: AbortSignal): Promise<void> {
  let end!: () => void;
  const rendering = new Promise<void>((resolve, reject) => {
    shared.rendering = { resolve, reject };
    end = resolve;
  });
  abortSignal.addEventListener("abort", end);
  if (abortSignal.aborted) end();
  try {
    await rendering;
  } finally {
    abortSignal.removeEventListener("abort", end);
  }
}

/** Whether a navigation waits until React shows its page */
export function isNavigationWaiting(): boolean {
  return shared.rendering !== undefined;
}

/** Ends the navigation waiting until React shows its page, with the error React threw on it if any. Also when a page leaves
 * for a redirect's target instead */
export function endNavigation(error?: unknown): void {
  const { rendering } = shared;
  shared.rendering = undefined;
  if (error === undefined) rendering?.resolve();
  else rendering?.reject(error);
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

// Never settles: the caller doesn't resume, the document goes away
export function leavePage(leave: () => void): Promise<never> {
  leave();
  return new Promise(() => {});
}
