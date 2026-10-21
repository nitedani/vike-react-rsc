import { useDeferredValue, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { Root as ReactRoot } from "react-dom/client";
import { createPageContextFromServer_experimentalRSC } from "vike/__internal/client";
import type { PageContextClient } from "vike/types";
import { PageContextProvider } from "../pageContext";
import { getShared } from "../shared";
import { AbortBoundary } from "./AbortBoundary";

// `fromAction`: a server action's answer sent `root`, after rerender() or as the page of a throw render()
type Shown = { pageContext: PageContextClient; root: ReactNode; fromAction?: boolean };

// One for every copy of this file: after an edit, Vite can load the next page's entry with a new copy
const shared = getShared(
  "page",
  (): {
    // The page Vike renders last: actions call its URL, and their answers apply only while it stays current
    current?: PageContextClient;
    // What Root shows, and how to change it once Root has mounted
    shown?: Shown;
    setRootState?: (shown: Shown) => void;
    // The React root Root renders in, to mount Root again after an error unmounted it or kept it from mounting
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

/** Ends the navigation waiting until React shows its page, e.g. a page that leaves for a redirect's target instead */
export function endNavigation(): void {
  settle();
}

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent, with the pageContext values it sent and none of the passToClient `keys` it didn't */
export function showRoot(root: ReactNode, passed: Record<string, unknown>, keys: string[], fromAction: boolean): void {
  // A new object, as a navigation's: the tree on screen keeps reading its own until React shows this one
  const pageContext = createPageContextFromServer_experimentalRSC(shared.current!, passed);
  for (const key of keys) if (!(key in passed)) Reflect.deleteProperty(pageContext, key);
  show({ pageContext, root, fromAction });
}

export function setReactRoot(reactRoot: ReactRoot): void {
  shared.reactRoot = reactRoot;
}

/** The React root's: an error React throws while rendering goes to the navigation showing the page, as in vike-react */
export function onUncaughtError(error: unknown, errorInfo: { componentStack?: string }): void {
  console.error(error, errorInfo.componentStack);
  // Vike renders the error page, and doesn't log the error again
  if (error instanceof Error) Object.assign(error, { isAlreadyLogged: true });
  // React unmounted Root, or never mounted it when hydrating threw: the next page, e.g. the error page, mounts it again
  shared.setRootState = (shown) => shared.reactRoot!.render(<Root page={shown} />);
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
  }, []);
  useEffect(() => {
    if (state === shared.shown) settle();
  }, [state]);
  // Called, not rendered: React's dev performance track reads every key of a component's old props, and Vike's pageContext throws on a key it couldn't serialize
  // TODO: remove once the react peer dependency requires a React release that includes https://github.com/react/react/pull/36867
  return PageContextProvider({
    pageContext: state.pageContext,
    children: <AbortBoundary keepsPage={!!state.fromAction}>{state.root}</AbortBoundary>,
  });
}
