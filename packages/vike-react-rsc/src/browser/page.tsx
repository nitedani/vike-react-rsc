import { useDeferredValue, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { Root as ReactRoot } from "react-dom/client";
import { createPageContextFromServer_experimentalRSC } from "vike/__internal/client";
import type { PageContextClient } from "vike/types";
import { applyHeadSettings } from "../integration/applyHeadSettings";
import type { HeadSettings } from "../integration/getHeadSettings";
import { isStrictMode, withStrictMode } from "../integration/withStrictMode";
import { PageContextProvider } from "../pageContext";
import { getShared } from "../shared";
import type { PageContextInternal } from "../types/PageContext";
import { AbortBoundary } from "./AbortBoundary";

// `fromAction`: a server action's answer sent `root`, after rerender() or as the page of a throw render()
// `headSettings`: the head an answer sent with `root`, which Root applies once React has committed it
type Shown = { pageContext: PageContextClient; root: ReactNode; headSettings?: HeadSettings; fromAction?: boolean };

// One for every copy of this file: after an edit, Vite can load the next page's entry with a new copy
const shared = getShared(
  "page",
  (): {
    // The pageContext of the page Vike showed, which actions' answers don't replace: actions call its URL, and their answers apply only while it's current
    current?: PageContextClient;
    // What Root shows, and how to change it once Root has mounted
    shown?: Shown;
    // The head the tab last got, the HTML's at first: an answer applies only the values that differ from it
    head?: HeadSettings;
    setRootState?: (shown: Shown) => void;
    // The React root Root renders in, to mount Root again after an error unmounted it or kept it from mounting
    reactRoot?: ReactRoot;
    // The navigation waiting until React shows its page, or throws on it
    rendering?: { resolve: () => void; reject: (error: unknown) => void };
  } => ({ head: readHtmlHead() })
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
  if (previous && isStrictMode(previous.pageContext) !== isStrictMode(next.pageContext)) shared.reactRoot!.render(getRootElement(next));
  else shared.setRootState?.(next);
}

/** Resolves once React shows what show() was last given or `abortSignal` aborts, or rejects with the error React throws while rendering it */
export async function rendered(abortSignal: AbortSignal): Promise<void> {
  let end!: () => void;
  const rendering = new Promise<void>((resolve, reject) => {
    shared.rendering = { resolve, reject };
    end = resolve;
  });
  abortSignal.addEventListener("abort", end);
  if (abortSignal.aborted) end();
  try {
    await rendering;
  } finally {
    abortSignal.removeEventListener("abort", end);
  }
}

/** Ends the navigation waiting until React shows its page, with the error React threw on it if any. Also when a page leaves
 * for a redirect's target instead */
export function endNavigation(error?: unknown): void {
  const { rendering } = shared;
  shared.rendering = undefined;
  if (error === undefined) rendering?.resolve();
  else rendering?.reject(error);
}

/** Shows the tree an action's answer sent, after rerender() or as a throw render()'s page, with the pageContext values it sent and none of the passToClient `keys` it didn't */
export function showRoot(root: ReactNode, passed: Record<string, unknown>, keys: string[], fromAction: boolean, headSettings: HeadSettings): void {
  // A new object, as a navigation's: the tree on screen keeps reading its own until React shows this one
  const pageContext = createPageContextFromServer_experimentalRSC(shared.current!, passed);
  for (const key of keys) if (!(key in passed)) Reflect.deleteProperty(pageContext, key);
  // Another page's tree, e.g. a throw render()'s, applies its whole head, as a navigation's page does
  if (pageContext.pageId !== shared.shown!.pageContext.pageId) shared.head = undefined;
  // As on a navigation, its components' useConfig() values wait for Root to apply the head
  (pageContext as PageContextInternal)._headAlreadySet = false;
  show({ pageContext, root, fromAction, headSettings });
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

// Around Root, not inside it: on hydration, React runs effects twice only under a <StrictMode> at the root
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
    // Once Root unmounts, e.g. as code renders something else into pageContext.root, the next page mounts it again
    return () => {
      shared.setRootState = (shown) => shared.reactRoot!.render(getRootElement(shown));
    };
  }, []);
  // Once React commits an answer's tree, applies its head; onRenderClient() applies a navigation's
  useEffect(() => {
    if (!state.headSettings) return;
    const pageContext = state.pageContext as PageContextClient & PageContextInternal;
    pageContext._headAlreadySet = true;
    applyHead(state.headSettings, pageContext, shared.head);
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

// What the page's components gave useConfig() while rendering wins, as getHeadSetting() does. A value the same as in
// `lastHead` stays as the tab has it, so a title the page set in the browser stays.
export function applyHead([title, lang, description]: HeadSettings, { _configViaHook }: PageContextInternal, lastHead?: HeadSettings): void {
  const pick = <T,>(viaHook: T | undefined, configured: T) => (viaHook !== undefined ? viaHook : configured);
  // As null, "" shows no title or description, and readHtmlHead() reads their missing tags as null
  const tagValue = (value: string | null | undefined) => (value === "" ? null : value);
  const head: HeadSettings = [tagValue(pick(_configViaHook?.title, title)), pick(_configViaHook?.lang, lang), tagValue(pick(_configViaHook?.description, description))];
  const [newTitle, newLang, newDescription] = head.map((value, i) => (value === lastHead?.[i] ? undefined : value));
  applyHeadSettings(newTitle, newLang, newDescription);
  shared.head = head;
}

// The head the HTML has: the server writes no title or description tag for null or "", so a missing one reads as null
function readHtmlHead(): HeadSettings {
  const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  return [document.head.querySelector("title")?.text ?? null, document.documentElement.getAttribute("lang"), description?.content ?? null];
}
