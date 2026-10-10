import { AsyncLocalStorage } from "async_hooks";
import type { PageContext } from "vike/types";

type ActionScope = { rerender: boolean; responseHeaders: Headers };

const scopes = {
  pageContext: new AsyncLocalStorage<PageContext>(),
  action: new AsyncLocalStorage<ActionScope>(),
};

export function providePageContext<T>(pageContext: PageContext, callback: () => T): T {
  return scopes.pageContext.run(pageContext, callback);
}

export function provideActionScope<T>(scope: ActionScope, callback: () => T): T {
  return scopes.action.run(scope, callback);
}

export function getPageContext(): PageContext {
  return scopes.pageContext.getStore()!;
}

/** Call it in a server action to also send the page, rendered after the action; otherwise only the return value is sent */
export function rerender(): void {
  const scope = scopes.action.getStore();
  if (scope) scope.rerender = true;
  else console.warn("[Server] rerender() called outside of a server action context");
}

/** The headers of the server action's response, e.g. `getResponseHeaders().append("Set-Cookie", "session=...")` */
export function getResponseHeaders(): Headers {
  const scope = scopes.action.getStore();
  if (!scope) throw new Error("[vike-react-rsc] getResponseHeaders() can only be called in a server action");
  return scope.responseHeaders;
}
