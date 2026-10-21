import { startTransition, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { createPageContextFromServer_experimentalRSC } from "vike/__internal/client";
import type { PageContextClient } from "vike/types";
import { applyHeadSettings } from "../integration/applyHeadSettings";
import { PageContextProvider } from "../pageContext";
import { AbortBoundary } from "./AbortBoundary";

// A navigation's title, lang and description, applied once React has committed its page
export type HeadSettings = Parameters<typeof applyHeadSettings>;
// `fromAction`: a server action's answer sent `root`, after rerender() or as the page of a throw render()
type Shown = { pageContext: PageContextClient; root: ReactNode; headSettings?: HeadSettings; fromAction?: boolean };

// Vike's pageContext of the page shown, which rerender() doesn't replace: actions call its URL, and their answers apply only while it stays current
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

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent, with the pageContext values it sent and none of the passToClient `keys` it didn't */
export function showRoot(root: ReactNode, passed: Record<string, unknown>, keys: string[], fromAction: boolean): void {
  // A new object, as a navigation's: the tree on screen keeps reading its own until React shows this one
  const pageContext = createPageContextFromServer_experimentalRSC(current, passed);
  for (const key of keys) if (!(key in passed)) Reflect.deleteProperty(pageContext, key);
  show({ ...shown, pageContext, root, fromAction });
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
  // Called, not rendered: React's dev performance track reads every key of a component's old props, and Vike's pageContext throws on a key it couldn't serialize
  // TODO: remove once the react peer dependency requires a React release that includes https://github.com/react/react/pull/36867
  return PageContextProvider({
    pageContext: state.pageContext,
    children: <AbortBoundary keepsPage={!!state.fromAction}>{state.root}</AbortBoundary>,
  });
}
