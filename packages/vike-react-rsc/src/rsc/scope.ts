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
  const pageContext = scopes.pageContext.getStore();
  if (!pageContext) throw new Error("[vike-react-rsc] getPageContext() can only be called while a server component renders or a server action runs");
  return pageContext;
}

/** Call it in a server action to also send the page, rendered after the action; otherwise only the return value is sent */
export function rerender(): void {
  getActionScope("rerender").rerender = true;
}

/** The headers of the server action's response, e.g. `getResponseHeaders().append("Set-Cookie", "session=...")` */
export function getResponseHeaders(): Headers {
  return getActionScope("getResponseHeaders").responseHeaders;
}

function getActionScope(caller: string): ActionScope {
  const scope = scopes.action.getStore();
  if (!scope) throw new Error(`[vike-react-rsc] ${caller}() can only be called in a server action`);
  return scope;
}
