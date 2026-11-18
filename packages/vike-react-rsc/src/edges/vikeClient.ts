// Vike's private names that the browser uses, until Vike has public ones: https://github.com/nitedani/vike-react-rsc/issues/48
import { createPageContextFromServer_experimentalRSC } from "vike/__internal/client";
import { navigate } from "vike/client/router";
import type { PageContextClient } from "vike/types";
import { getShared } from "../shared";

export { readPageContextJson } from "vike/__internal/client";

/** A new pageContext for the page `current` shows, with the values the server `passed`, as a navigation's */
export function createPageContextFromServer(current: PageContextClient, passed: Record<string, unknown>): PageContextClient {
  return createPageContextFromServer_experimentalRSC(current, passed);
}

/** Vike renders its error page for `error` without logging it again */
export function markLogged(error: unknown): void {
  if (error instanceof Error && Object.isExtensible(error)) Object.assign(error, { isAlreadyLogged: true });
}

// What React threw on a page once no navigation was waiting, for showErrorPage()'s navigation to throw. One for every copy
// of this file: after an edit, Vite can load the next page's entry with a new copy.
const shared = getShared("lateError", (): { lateError?: { urlPathname: string; thrown: unknown } } => ({}));

/** Shows Vike's error page for what React threw on the page `current` once its navigation ended, e.g. once a Suspense
 * fallback showed, and React unmounted the page. Vike shows the error page only for what a hook throws, so a new
 * navigation's onCreatePageContext hook throws it, before Vike fetches the page again. Stops at the error page's own error.
 * TODO: replace with Vike's API, once https://github.com/vikejs/vike/issues/3726 lets it show its error page from a component */
export function showErrorPage(thrown: unknown, current: PageContextClient): void {
  const { urlPathname, isErrorPage, isHydration, abortSignal } = current;
  // Vike aborts the shown page's signal once the next navigation commits: that navigation's page mounts Root again
  if (isErrorPage || abortSignal.aborted) return;
  shared.lateError = { urlPathname, thrown };
  // A static host has no error page, so Vike reloads a client navigation: after the first render's error, that would loop
  // A new history entry would trap Back: going back reruns the page, which throws and pushes another
  void navigate(location.href, { keepScrollPosition: true, overwriteLastHistoryEntry: true, pageContext: isHydration ? { isClientSideNavigation: false } : undefined });
}

/** Throws what React threw on this page once no navigation was waiting. Vike's hook, in the browser. */
export function throwLateError(pageContext: PageContextClient): void {
  const { lateError } = shared;
  shared.lateError = undefined;
  if (lateError?.urlPathname === pageContext.urlPathname && !pageContext.isErrorPage) throw lateError.thrown;
}
