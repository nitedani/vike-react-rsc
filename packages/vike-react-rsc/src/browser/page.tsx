import { startTransition, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { PageContextClient } from "vike/types";
import { PageContextProvider } from "../pageContext";
import { getShared } from "../shared";

type Shown = { pageContext: PageContextClient; root: ReactNode };

// One for every copy of this file: after an edit, Vite can load the next page's entry with a new copy
const shared = getShared(
  "page",
  (): {
    // The page Vike renders last: actions call its URL, and their answers apply only while it stays current
    current?: PageContextClient;
    // What Root shows, and how to change it once Root has mounted
    shown?: Shown;
    setRootState?: (shown: Shown) => void;
  } => ({})
);

export function setCurrentPageContext(pageContext: PageContextClient): void {
  shared.current = pageContext;
}

export function getCurrentPageContext(): PageContextClient {
  return shared.current!;
}

export function show(next: Shown): void {
  shared.shown = next;
  // The current page stays on screen until the next one can render, instead of the nearest Loading.layout
  startTransition(() => shared.setRootState?.(next));
}

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent */
export function showRoot(root: ReactNode): void {
  show({ pageContext: shared.shown!.pageContext, root });
}

/** Hydrates `page`, then shows what show() shows */
export function Root({ page }: { page: Shown }): ReactElement {
  const [state, setState] = useState(page);
  useEffect(() => {
    shared.setRootState = setState;
    // A navigation or an action can finish while React hydrates
    setState(shared.shown!);
  }, []);
  return <PageContextProvider pageContext={state.pageContext}>{state.root}</PageContextProvider>;
}
