import { useDeferredValue, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { Root as ReactRoot } from "react-dom/client";
import { createPageContextFromServer_experimentalRSC } from "vike/__internal/client";
import type { PageContextClient } from "vike/types";
import { applyHeadSettings } from "../integration/applyHeadSettings";
import { withStrictMode } from "../integration/withStrictMode";
import { PageContextProvider } from "../pageContext";
import { getShared } from "../shared";
import { AbortBoundary } from "./AbortBoundary";

// A navigation's title, lang and description, applied once React has committed its page
export type HeadSettings = Parameters<typeof applyHeadSettings>;
// `fromAction`: a server action's answer sent `root`, after rerender() or as the page of a throw render()
type Shown = { pageContext: PageContextClient; root: ReactNode; headSettings?: HeadSettings; fromAction?: boolean };

// One for every copy of this file: after an edit, Vite can load the next page's entry with a new copy
const shared = getShared(
  "page",
  (): {
    // Vike's pageContext of the page shown, which rerender() doesn't replace: actions call its URL, and their answers apply
    // only while it stays current
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
  const previous = shared.shown;
  shared.shown = next;
  // As in vike-react, a navigation that turns +reactStrictMode on or off mounts the page again, its layouts included
  const isFlip = previous && (previous.pageContext.config.reactStrictMode === false) !== (next.pageContext.config.reactStrictMode === false);
  if (isFlip) shared.reactRoot!.render(getRootElement(next));
  else shared.setRootState?.(next);
}

/** Resolves once React shows what show() was last given, or rejects with the error React throws while rendering it */
export function rendered(): Promise<void> {
  return new Promise((resolve, reject) => (shared.rendering = { resolve, reject }));
}

/** Ends the navigation waiting until React shows its page, with the error React threw on it if any. Also when a page leaves
 * for a redirect's target instead */
export function endNavigation(error?: unknown): void {
  const { rendering } = shared;
  shared.rendering = undefined;
  if (error === undefined) rendering?.resolve();
  else rendering?.reject(error);
}

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent, with the pageContext values it sent and none of the passToClient `keys` it didn't */
export function showRoot(root: ReactNode, passed: Record<string, unknown>, keys: string[], fromAction: boolean): void {
  // A new object, as a navigation's: the tree on screen keeps reading its own until React shows this one
  const pageContext = createPageContextFromServer_experimentalRSC(shared.current!, passed);
  for (const key of keys) if (!(key in passed)) Reflect.deleteProperty(pageContext, key);
  show({ ...shared.shown, pageContext, root, fromAction });
}

export function setReactRoot(reactRoot: ReactRoot): void {
  shared.reactRoot = reactRoot;
}

export function getReactRoot(): ReactRoot {
  return shared.reactRoot!;
}

/** The React root's: an error React throws while rendering goes to the navigation showing the page, as in vike-react */
export function onUncaughtError(error: unknown, errorInfo: { componentStack?: string }): void {
  console.error(error, errorInfo.componentStack);
  // Vike renders the error page, and doesn't log the error again
  if (error instanceof Error) Object.assign(error, { isAlreadyLogged: true });
  // React unmounted Root, or never mounted it when hydrating threw: the next page, e.g. the error page, mounts it again
  shared.setRootState = (shown) => shared.reactRoot!.render(getRootElement(shown));
  endNavigation(error);
}

/** What the React root renders: Root, inside <StrictMode> unless its page sets +reactStrictMode to false. Around Root, not
 * inside it: on hydration, React runs effects twice only under a <StrictMode> at the root */
export function getRootElement(page: Shown): ReactElement {
  return withStrictMode(page.pageContext, <Root page={page} />);
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
  // Once React has committed the next page; rerender() keeps its head settings
  useEffect(() => {
    if (state.headSettings) applyHeadSettings(...state.headSettings);
  }, [state.headSettings]);
  useEffect(() => {
    if (state === shared.shown) endNavigation();
  }, [state]);
  // Called, not rendered: React's dev performance track reads every key of a component's old props, and Vike's pageContext throws on a key it couldn't serialize
  // TODO: remove once the react peer dependency requires a React release that includes https://github.com/react/react/pull/36867
  return PageContextProvider({
    pageContext: state.pageContext,
    children: <AbortBoundary keepsPage={!!state.fromAction}>{state.root}</AbortBoundary>,
  });
}
