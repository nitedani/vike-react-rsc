import { startTransition, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { PageContextClient } from "vike/types";
import { PageContextProvider } from "../pageContext";
import { applyHeadSettings } from "../integration/applyHeadSettings";

// A navigation's title, lang and description, applied once React has committed its page
export type HeadSettings = Parameters<typeof applyHeadSettings>;
type Shown = { pageContext: PageContextClient; root: ReactNode; headSettings?: HeadSettings };

// What Root shows, and how to change it once Root has mounted
let shown: Shown;
let setRootState: ((shown: Shown) => void) | undefined;

/** The page shown: actions call its URL, and their answers apply only while it stays shown */
export function getCurrentPageContext(): PageContextClient {
  return shown.pageContext;
}

export function show(next: Shown): void {
  shown = next;
  // The current page stays on screen until the next one can render, instead of the nearest Loading.layout
  startTransition(() => setRootState?.(next));
}

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent */
export function showRoot(root: ReactNode): void {
  show({ ...shown, root });
}

/** Hydrates `page`, then shows what show() shows */
export function Root({ page }: { page: Shown }): ReactElement {
  const [state, setState] = useState(page);
  useEffect(() => {
    setRootState = setState;
    // A navigation or an action can finish while React hydrates
    setState(shown);
  }, []);
  // Once React has committed the next page; rerender() keeps its head settings
  useEffect(() => {
    if (state.headSettings) applyHeadSettings(...state.headSettings);
  }, [state.headSettings]);
  return <PageContextProvider pageContext={state.pageContext}>{state.root}</PageContextProvider>;
}
