import { AsyncLocalStorage } from "node:async_hooks";
import type { PageContext, PageContextServer } from "vike/types";
import { notInServerAction } from "../errors";
import { getForkedPageContext } from "../forkPageContext";
import { getShared } from "../shared";
import type { ActionOutcome } from "../types";

// React and user code call server components and server actions without a pageContext argument, so they find their
// request here
type Scope = {
  pageContext: PageContext;
  // The outcome the running action builds
  action?: { outcome: ActionOutcome };
};

const storage = getShared("scope", () => new AsyncLocalStorage<Scope>());

export function runInScope<T>(scope: Scope, run: () => T): T {
  return storage.run(scope, run);
}

export function getPageContext(): PageContextServer {
  const scope = storage.getStore();
  if (!scope) {
    throw new Error("[vike-react-rsc] getPageContext() needs a server component render or a server action, and neither runs here");
  }
  return getForkedPageContext(scope.pageContext) as PageContextServer;
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
