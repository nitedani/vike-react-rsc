import { useDeferredValue, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { Root as ReactRoot } from "react-dom/client";
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
    // The React root Root renders in, to mount Root again after an error unmounted it
    reactRoot?: ReactRoot;
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

export function show(next: Shown): void {
  shared.shown = next;
  shared.setRootState?.(next);
}

/** Resolves once React shows what show() was last given, or rejects with the error React throws while rendering it */
export function rendered(): Promise<void> {
  return new Promise((resolve, reject) => (shared.rendering = { resolve, reject }));
}

function settle(error?: unknown): void {
  const { rendering } = shared;
  shared.rendering = undefined;
  if (error === undefined) rendering?.resolve();
  else rendering?.reject(error);
}

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent */
export function showRoot(root: ReactNode): void {
  show({ pageContext: shared.shown!.pageContext, root });
}

export function setReactRoot(reactRoot: ReactRoot): void {
  shared.reactRoot = reactRoot;
}

/** The React root's: an error React throws while rendering goes to the navigation showing the page, as in vike-react */
export function onUncaughtError(error: unknown, errorInfo: { componentStack?: string }): void {
  console.error(error, errorInfo.componentStack);
  // Vike renders the error page, and doesn't log the error again
  if (error instanceof Error) Object.assign(error, { isAlreadyLogged: true });
  settle(error);
}

/** Hydrates `page`, then shows what show() shows */
export function Root({ page }: { page: Shown }): ReactElement {
  const [latest, setState] = useState(page);
  // The current page stays on screen until the next one can render, instead of the nearest Loading.layout. Not a
  // transition: React holds back a transition started while an action runs until the action ends, and an action can
  // await navigate(), which waits until React shows the page.
  const state = useDeferredValue(latest);
  useEffect(() => {
    shared.setRootState = setState;
    // A navigation or an action can finish while React hydrates
    setState(shared.shown!);
    // An uncaught error unmounts Root: the next page, e.g. the error page, mounts it again
    return () => {
      shared.setRootState = (shown) => shared.reactRoot!.render(<Root page={shown} />);
    };
  }, []);
  useEffect(() => {
    if (state === shared.shown) settle();
  }, [state]);
  return <PageContextProvider pageContext={state.pageContext}>{state.root}</PageContextProvider>;
}
