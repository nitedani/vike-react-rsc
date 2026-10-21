import { Component, useEffect, type ReactNode } from "react";
import type { HydrationOptions } from "react-dom/client";
import { getAbort } from "../abort";
import { usePageContext } from "../pageContext";
import { followRedirect, wasAnswered } from "./callServer";

type Props = { children: ReactNode };
type State = { children?: ReactNode; redirectTo?: string };

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
    return { redirectTo: abort.redirect.url };
  }

  render(): ReactNode {
    return this.state.redirectTo ? <Redirect url={this.state.redirectTo} /> : this.props.children;
  }
}

// AbortBoundary catches only the redirects it follows; a boundary of the app's may swallow one, so it's reported
export const onCaughtError: HydrationOptions["onCaughtError"] = (error, errorInfo) => {
  if (!(errorInfo.errorBoundary instanceof AbortBoundary)) console.error(error, errorInfo.componentStack);
};

function Redirect({ url }: { url: string }) {
  const pageContext = usePageContext();
  useEffect(() => {
    const leave = () => {
      // The HTML's redirect meta makes the browser load the target: only once
      if (document.querySelector("meta[data-vike-react-rsc-redirect]")) return;
      // Thrown in what Vike navigated to, or what an rsc() load rendered: as with an HTTP redirect, the page's URL doesn't
      // stay in history
      void followRedirect(url, wasAnswered(pageContext));
    };
    // The meta comes after the error in the HTML
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", leave, { once: true });
      return () => document.removeEventListener("DOMContentLoaded", leave);
    }
    leave();
  }, [url]);
  return null;
}
