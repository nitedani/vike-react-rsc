import { Component, useEffect, type ReactNode } from "react";
import { navigate } from "vike/client/router";
import { getAbort } from "../abort";

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

function Redirect({ url }: { url: string }) {
  useEffect(() => {
    const leave = () => {
      // The HTML's redirect meta makes the browser load the target: only once
      if (document.querySelector("meta[data-vike-react-rsc-redirect]")) return;
      const target = new URL(url, location.href);
      if (target.origin !== location.origin) location.replace(target.href);
      else void navigate(target.pathname + target.search + target.hash, { overwriteLastHistoryEntry: true });
    };
    // The meta comes after the error in the HTML
    if (document.readyState !== "loading") return leave();
    document.addEventListener("DOMContentLoaded", leave, { once: true });
    return () => document.removeEventListener("DOMContentLoaded", leave);
  }, [url]);
  return null;
}
