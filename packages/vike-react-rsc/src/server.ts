// vike-react-rsc/server outside the rsc env, e.g. imported by a client component or by data()
import { noRequestContext, notInServerAction } from "./errors";
import type { RequestContext } from "./types";

/** Makes the server action's answer include the page, rendered again once the action returned. Without it, the answer is only the return value. */
export function rerender(): void {
  throw notInServerAction();
}

/** The request, in a server action or a server component: its `headers`, its `cookies`, its `abortSignal`, and what your server and your +middleware add, such as `req` or `user`. Not what Vike and your app compute for a page: `routeParams`, the page's config, `data`, what your +onCreatePageContext sets. */
export function getRequestContext(): RequestContext {
  throw noRequestContext();
}
