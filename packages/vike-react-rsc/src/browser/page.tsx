import { startTransition, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { PageContextClient } from "vike/types";
import { PageContextProvider } from "../pageContext";
import { applyHeadSettings } from "./headSettings";

type Shown = { pageContext: PageContextClient; root: ReactNode };

// The page Vike renders last: actions call its URL, and their answers apply only while it stays current
let current: PageContextClient;
// What Root shows, and how to change it once Root has mounted
let shown: Shown;
let setRootState: ((shown: Shown) => void) | undefined;

export function setCurrentPageContext(pageContext: PageContextClient): void {
  current = pageContext;
}

export function getCurrentPageContext(): PageContextClient {
  return current;
}

export function show(next: Shown): void {
  shown = next;
  // The current page stays on screen until the next one can render, instead of the nearest Loading.layout
  startTransition(() => setRootState?.(next));
}

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent */
export function showRoot(root: ReactNode): void {
  show({ pageContext: shown.pageContext, root });
}

/** Hydrates `page`, then shows what show() shows */
export function Root({ page }: { page: Shown }): ReactElement {
  const [state, setState] = useState(page);
  useEffect(() => {
    setRootState = setState;
    // A navigation or an action can finish while React hydrates
    setState(shown);
  }, []);
  // Once React has committed the next page; rerender() keeps the pageContext, and the HTML has the hydrated page's
  useEffect(() => {
    if (!state.pageContext.isHydration) applyHeadSettings(state.pageContext);
  }, [state.pageContext]);
  return <PageContextProvider pageContext={state.pageContext}>{state.root}</PageContextProvider>;
}
