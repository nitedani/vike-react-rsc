import { startTransition, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { PageContextClient } from "vike/types";
import { PageContextProvider } from "../pageContext";

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

/** Shows a new tree for the page shown, e.g. the one an action's rerender() sent, with the pageContext values it sent and none of the passToClient `keys` it didn't */
export function showRoot(root: ReactNode, passed: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) if (!(key in passed)) Reflect.deleteProperty(current, key);
  // Set on Vike's pageContext, which throws on reading a value it couldn't serialize; a new object, so usePageContext() renders again
  Object.assign(current, passed);
  show({ pageContext: Object.create(current), root });
}

/** Hydrates `page`, then shows what show() shows */
export function Root({ page }: { page: Shown }): ReactElement {
  const [state, setState] = useState(page);
  useEffect(() => {
    setRootState = setState;
    // A navigation or an action can finish while React hydrates
    setState(shown);
  }, []);
  // Called, not rendered: React's dev performance track reads every key of a component's old props, and Vike's pageContext throws on a key it couldn't serialize
  // TODO: remove once the react peer dependency requires a React release that includes https://github.com/react/react/pull/36867
  return PageContextProvider({ pageContext: state.pageContext, children: state.root });
}
