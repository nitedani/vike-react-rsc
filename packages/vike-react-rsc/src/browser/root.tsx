import { useDeferredValue, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { Root as ReactRoot } from "react-dom/client";
import type { PageContextClient } from "vike/types";
import { getAbort, toVikeAbort } from "../abort";
import { createPageContextFromServer, markLogged, showErrorPage } from "../edges/vikeClient";
import { applyHeadSettings } from "../integration/applyHeadSettings";
import type { HeadSettings } from "../integration/getHeadSettings";
import { isStrictMode, withStrictMode } from "../integration/withStrictMode";
import { PageContextProvider } from "../pageContext";
import { getShared } from "../shared";
import type { PageContextInternal } from "../types/PageContext";
import { AbortBoundary } from "./AbortBoundary";
import { endNavigation, getCurrentPageContext, isNavigationWaiting, type RedirectHistory } from "./navigation";

// `redirectHistory`: of a redirect `root` throws, the same as for the call whose answer sent it, after rerender() or as a
// throw render()'s page. A navigation's page has none: its redirect replaces it.
// `headSettings`: the head an answer sent with `root`, which Root applies once React has committed it
type Shown = { pageContext: PageContextClient; root: ReactNode; headSettings?: HeadSettings; redirectHistory?: RedirectHistory };

// One for every copy of this file: after an edit, Vite can load the next page's entry with a new copy
const shared = getShared(
  "root",
  (): {
    // What Root shows, and how to change it once Root has mounted
    shown?: Shown;
    // The head we last applied, the HTML's at first, not what useConfig() set since: an answer applies only the values that differ from it
    head?: HeadSettings;
    setRootState?: (shown: Shown) => void;
    // The React root Root renders in, to mount Root again after an error unmounted it or kept it from mounting
    reactRoot?: ReactRoot;
    // What server function calls rejected with: React throws one on the page, e.g. a form action's
    callRejections: WeakSet<Error>;
  } => ({ head: readHtmlHead(), callRejections: new WeakSet() })
);

export function show(next: Shown): void {
  const previous = shared.shown;
  shared.shown = next;
  // As in vike-react, a navigation that turns +reactStrictMode on or off mounts the page again, its layouts included
  if (previous && isStrictMode(previous.pageContext) !== isStrictMode(next.pageContext)) shared.reactRoot!.render(getRootElement(next));
  else shared.setRootState?.(next);
}

/** Shows the tree an action's answer sent, after rerender() or as a throw render()'s page, with the pageContext values it sent and none of the passToClient `keys` it didn't */
export function showRoot({ root, passed, keys, redirectHistory, headSettings }: { root: ReactNode; passed: Record<string, unknown>; keys: string[]; redirectHistory: RedirectHistory; headSettings: HeadSettings }): void {
  // A new object, as a navigation's: the tree on screen keeps reading its own until React shows this one
  const pageContext = createPageContextFromServer(getCurrentPageContext(), passed);
  for (const key of keys) if (!(key in passed)) Reflect.deleteProperty(pageContext, key);
  // Another page's tree, e.g. a throw render()'s, applies its whole head, as a navigation's page does
  if (pageContext.pageId !== shared.shown!.pageContext.pageId) shared.head = undefined;
  // As on a navigation, its components' useConfig() values wait for Root to apply the head
  (pageContext as PageContextInternal)._headAlreadySet = false;
  show({ pageContext, root, redirectHistory, headSettings });
}

export function setReactRoot(reactRoot: ReactRoot): void {
  shared.reactRoot = reactRoot;
}

export function getReactRoot(): ReactRoot | undefined {
  return shared.reactRoot;
}

/** The React root's: an error React throws while rendering goes to the navigation showing the page, as in vike-react, or else to a new one */
export function onUncaughtError(error: unknown, componentStackToLog: string | undefined): void {
  // React unmounted Root, or never mounted it when hydrating threw: the next page, e.g. the error page, mounts it again
  shared.setRootState = (shown) => shared.reactRoot!.render(getRootElement(shown));
  const abort = getAbort(error);
  // A server component's `throw render()` while a navigation waits for the page: Vike answers it, unlogged, as on the server
  if (abort && isNavigationWaiting()) return endNavigation(toVikeAbort(abort));
  console.error(...(componentStackToLog ? [error, componentStackToLog] : [error]));
  markLogged(error);
  if (isNavigationWaiting()) endNavigation(error);
  // Not for the error page's own render error, which it would throw again; a call's rejection, e.g. its Try again's, shows it again
  else if (shared.callRejections.has(error as Error) || !isErrorPageShown()) showErrorPage(abort ? toVikeAbort(abort) : error, getCurrentPageContext());
}

// An action's answer is never Vike's error page, though its pageContext, a fork of the page Vike showed, keeps that page's isErrorPage
function isErrorPageShown(): boolean {
  const { pageContext } = shared.shown!;
  return pageContext === getCurrentPageContext() && pageContext.isErrorPage === true;
}

export function markCallRejection(error: unknown): void {
  if (error instanceof Error) shared.callRejections.add(error);
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
    applyShownHead(state.headSettings, pageContext, shared.head);
  }, [state.headSettings]);
  useEffect(() => {
    if (state === shared.shown) endNavigation();
  }, [state]);
  // Called, not rendered: React's dev performance track reads every key of a component's old props, and Vike's pageContext throws on a key it couldn't serialize
  // TODO: remove once the react peer dependency requires a React release that includes https://github.com/react/react/pull/36867
  return PageContextProvider({
    pageContext: state.pageContext,
    children: <AbortBoundary redirectHistory={state.redirectHistory ?? "replace"}>{state.root}</AbortBoundary>,
  });
}

// What the page's components gave useConfig() while rendering wins, as getHeadSetting() does. A value the same as in
// `lastHead` stays as the tab has it, so a title the page set in the browser stays.
export function applyShownHead(headSettings: HeadSettings, { _configViaHook }: PageContextInternal, lastHead?: HeadSettings): void {
  const pick = (name: keyof HeadSettings) => (_configViaHook?.[name] !== undefined ? _configViaHook[name] : headSettings[name]);
  // As null, "" shows no title or description, and readHtmlHead() reads their missing tags as null
  const tagValue = (value: string | null | undefined) => (value === "" ? null : value);
  const head: HeadSettings = { title: tagValue(pick("title")), lang: pick("lang"), description: tagValue(pick("description")) };
  const changed = (name: keyof HeadSettings) => (head[name] === lastHead?.[name] ? undefined : head[name]);
  applyHeadSettings(changed("title"), changed("lang"), changed("description"));
  shared.head = head;
}

// The head the HTML has: the server writes no title or description tag for null or "", so a missing one reads as null
function readHtmlHead(): HeadSettings {
  const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  return { title: document.head.querySelector("title")?.text ?? null, lang: document.documentElement.getAttribute("lang"), description: description?.content ?? null };
}
