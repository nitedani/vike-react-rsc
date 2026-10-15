import { AsyncLocalStorage } from "node:async_hooks";
import type { PageContext } from "vike/types";
import { notInServerAction } from "../errors";
import { getShared } from "../shared";
import type { ActionOutcome } from "../types";

// React and user code call server components and server actions without a pageContext argument, so they find their
// request here
type Scope = {
  pageContext: PageContext;
  // The outcome the running action builds
  action?: { outcome: ActionOutcome; responseHeaders: Headers };
};

const storage = getShared("scope", () => new AsyncLocalStorage<Scope>());

export function runInScope<T>(scope: Scope, run: () => T): T {
  return storage.run(scope, run);
}

export function getPageContext(): PageContext {
  const scope = storage.getStore();
  if (!scope) {
    throw new Error("[vike-react-rsc] getPageContext() needs a server component render or a server action, and neither runs here");
  }
  return scope.pageContext;
}

export function rerender(): void {
  getAction("rerender").outcome.rerender = true;
}

export function getResponseHeaders(): Headers {
  return getAction("getResponseHeaders").responseHeaders;
}

function getAction(name: string): NonNullable<Scope["action"]> {
  const action = storage.getStore()?.action;
  if (!action) throw notInServerAction(name);
  return action;
}
