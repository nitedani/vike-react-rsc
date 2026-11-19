import type { PageContextClient } from "vike/types";
import { getAbort, toVikeAbort } from "../abort";
import { markLogged, showErrorPage } from "../edges/vikeClient";
import { getShared } from "../shared";
import { endNavigation, getCurrentPageContext, isNavigationWaiting } from "./navigation";
import { getShownPageContext, remountOnNextShow } from "./root";

// One for every copy of this file: after an edit, Vite can load the next page's entry with a new copy
const shared = getShared(
  "uncaughtError",
  (): {
    // The page Vike showed when the user last clicked or pressed a key
    lastInputOn?: PageContextClient;
  } => {
    // A click, which a screen reader sends alone, or a key, as in a field; in the capture phase, so a handler that stops it counts too
    for (const type of ["click", "keydown"]) addEventListener(type, () => (shared.lastInputOn = getCurrentPageContext()), true);
    return {};
  }
);

/** The React root's: an error React throws while rendering goes to the navigation showing the page, as in vike-react, or else to a new one */
export function onUncaughtError(error: unknown, componentStackToLog: string | undefined): void {
  // React unmounted Root, or never mounted it when hydrating threw: the next page, e.g. the error page, mounts it again
  remountOnNextShow();
  const abort = getAbort(error);
  // A server component's `throw render()` while a navigation waits for the page: Vike answers it, unlogged, as on the server
  if (abort && isNavigationWaiting()) return endNavigation(toVikeAbort(abort));
  console.error(...(componentStackToLog ? [error, componentStackToLog] : [error]));
  markLogged(error);
  if (isNavigationWaiting()) return endNavigation(error);
  // Showing it again would throw it again: the page stays blank, as Vike leaves an error page that fails
  if (isErrorPageOwnError()) return;
  showErrorPage(abort ? toVikeAbort(abort) : error, getCurrentPageContext());
}

// Vike's error page is on screen, and no one clicked or pressed a key since Vike showed it, e.g. on its Try again
function isErrorPageOwnError(): boolean {
  const current = getCurrentPageContext();
  // An action's answer replaces the tree under a fork of Vike's pageContext, which keeps isErrorPage
  // TODO: compare only isErrorPage once https://github.com/vikejs/vike/pull/3753 is released
  return current.isErrorPage === true && getShownPageContext() === current && shared.lastInputOn !== current;
}
