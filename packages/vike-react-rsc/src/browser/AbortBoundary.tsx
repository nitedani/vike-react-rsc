import { Component, use, type ReactNode } from "react";
import type { HydrationOptions } from "react-dom/client";
import { getAbort } from "../abort";
import { followRedirect } from "./callServer";
import { isThrownByRscOutput } from "./rsc";

// `keepsPage`: a server action's answer sent the children, so their redirect keeps the page in history, as the
// action's own redirect does
type Props = { children: ReactNode; keepsPage: boolean };
type State = { children?: ReactNode; redirectTo?: string; isFromRscOutput?: boolean; thrown?: object };

/** Leaves for the target of a `throw redirect()` that a server component threw after the response started: in the
 * HTML's Suspense boundaries, a navigation's Flight, an rsc() load or an action's rerender() */
export class AbortBoundary extends Component<Props, State> {
  state: State = {};

  // Another tree to show: the last one's redirect doesn't apply to it
  static getDerivedStateFromProps({ children }: Props, state: State): State | null {
    return children === state.children ? null : { children, redirectTo: undefined };
  }

  static getDerivedStateFromError(error: unknown): State {
    const abort = getAbort(error);
    // A `throw render()`: Vike's client router can't show the error page from here
    if (!abort || !("redirect" in abort)) throw error;
    return { redirectTo: abort.redirect.url, isFromRscOutput: isThrownByRscOutput(error), thrown: error as object };
  }

  render(): ReactNode {
    const { redirectTo, isFromRscOutput, thrown } = this.state;
    // An rsc() output loads on its own, even inside what the answer sent
    return redirectTo ? <Redirect thrown={thrown!} url={redirectTo} keepsPage={this.props.keepsPage && !isFromRscOutput} /> : this.props.children;
  }
}

// AbortBoundary catches only the redirects it follows; a boundary of the app's may swallow one, so it's reported
export const onCaughtError: HydrationOptions["onCaughtError"] = (error, errorInfo) => {
  if (errorInfo.errorBoundary instanceof AbortBoundary) return;
  const abort = getAbort(error);
  if (abort && "redirect" in abort) {
    const hint = "[vike-react-rsc] An error boundary caught a throw redirect(), so the browser stays on the page: throw it outside that boundary, or in guard() or data()";
    unlessHtmlRedirects(() => console.error(hint, error, errorInfo.componentStack));
  } else {
    console.error(error, errorInfo.componentStack);
  }
};

// One per thrown redirect: React renders the boundary again each time it retries the update that threw it
const leaving = new WeakMap<object, Promise<never>>();

function Redirect({ thrown, url, keepsPage }: { thrown: object; url: string; keepsPage: boolean }): ReactNode {
  if (!leaving.has(thrown)) {
    // Replaces the page in history, as an HTTP redirect does, unless a server action's answer sent what threw it
    unlessHtmlRedirects(() => void followRedirect(url, keepsPage));
    leaving.set(thrown, new Promise(() => {}));
  }
  // No Suspense boundary is above, so the update that threw never commits: the page stays shown until the target renders
  return use(leaving.get(thrown)!);
}

// The HTML's redirect meta makes the browser load the target itself
function unlessHtmlRedirects(run: () => void): void {
  const check = () => {
    if (!document.querySelector("meta[data-vike-react-rsc-redirect]")) run();
  };
  // The meta comes after the error in the HTML
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check, { once: true });
    return;
  }
  check();
}
