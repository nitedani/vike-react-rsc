import { AsyncLocalStorage } from "node:async_hooks";
import type { PageContext, PageContextServer } from "vike/types";
import { noRequestContext, notInServerAction } from "../errors";
import { getForkedPageContext } from "../forkPageContext";
import { getShared } from "../shared";
import type { ActionOutcome, RequestContext } from "../types";

// React and user code call server components and server actions without a pageContext argument, so they find their
// request here
export type Scope = {
  pageContext: PageContext;
  // The outcome the running action builds
  action?: { outcome: ActionOutcome };
  // Rendering what an action returns without rerender(), outside rsc(): the page's guard() and data() didn't run
  withoutPage?: boolean;
};

const storage = getShared("scope", () => new AsyncLocalStorage<Scope>());

export function runInScope<T>(scope: Scope, run: () => T): T {
  return storage.run(scope, run);
}

export function getPageContext(): PageContextServer {
  return readPageContext("getPageContext()");
}

/** The page's pageContext; its errors name `caller`, the function the user called */
export function readPageContext(caller: string): PageContextServer {
  return getForkedPageContext(readHtmlPageContext(caller));
}

/** The pageContext the HTML render reads, without the fork that server components see */
export function readHtmlPageContext(caller: string): PageContextServer {
  const scope = storage.getStore();
  if (!scope) {
    throw new Error(`[vike-react-rsc] ${caller} needs a server component render, and none runs here`);
  }
  // An action runs for the request, from whichever page called it
  if (scope.action) {
    throw new Error(`[vike-react-rsc] ${caller} needs a page, and a server action or a component passed to rsc() has none: call getRequestContext() from vike-react-rsc/server`);
  }
  if (scope.withoutPage) {
    throw new Error(`[vike-react-rsc] ${caller} needs a page, and the server components a server action returns without rerender() have none: load them with rsc(), or call getRequestContext() from vike-react-rsc/server`);
  }
  return scope.pageContext as PageContextServer;
}

export function getRequestContext(): RequestContext {
  const scope = storage.getStore();
  if (!scope) throw noRequestContext();
  const pageContext = scope.pageContext as PageContextServer & { _pageContextInit: { rscAction?: unknown } };
  // What renderPage() got from the server and every middleware, without rscAction, which vike-react-rsc sets for itself
  const { rscAction: _, ...init } = pageContext._pageContextInit;
  return { ...init, headers: pageContext.headers, cookies: pageContext.cookies, abortSignal: pageContext.abortSignal };
}

/** Whether server components render here, e.g. a page's, outside a server action */
export function isRenderingServerComponents(): boolean {
  const scope = storage.getStore();
  return !!scope && !scope.action;
}

export function rerender(): void {
  const action = storage.getStore()?.action;
  if (!action) throw notInServerAction();
  action.outcome.rerender = true;
}
