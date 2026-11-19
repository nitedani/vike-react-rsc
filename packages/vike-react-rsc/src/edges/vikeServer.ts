// Vike's private names that the server's hooks and middleware use, until Vike has public ones:
// https://github.com/nitedani/vike-react-rsc/issues/48. Also private, where they are used: the shape of Vike's dev CSS
// links (ssr/clientDeps.tsx) and Vike's asset file names (vite.ts).
import { getPageContextJson } from "vike/__internal";
import type { PageContextServer } from "vike/types";

/** Vike runs neither guard() nor data() for the page */
export function skipGuardAndData(pageContext: PageContextServer): void {
  pageContext._skipGuardAndData_experimentalRSC = true;
}

// The values Vike passes to the browser for every page, besides passToClient's, e.g. data, which a page without +data doesn't have:
// Vike's passToClientBuiltInPageContext (vike/dist/server/runtime/renderPageServer/html/serializeContext.js), which it doesn't export
// TODO: remove once Vike's createPageContextFromServer_experimentalRSC() drops the values the server no longer sends: https://github.com/nitedani/vike-react-rsc/issues/48
const VIKE_PASSED_TO_CLIENT = ["abortReason", "_urlRewrite", "_urlRedirect", "abortStatusCode", "_abortCall", "_pageContextInitIsPassedToClient", "pageId", "routeParams", "data"];

/** pageContext's values for the browser, serialized as Vike serializes them for a navigation, and the key of every value
 * Vike can pass: the keys let the browser drop a value the server no longer sets, as a navigation's new pageContext
 * doesn't have it */
export function getPassedToClient(pageContext: PageContextServer): { json: string | ReadableStream<Uint8Array>; keys: string[] } {
  const keys = (pageContext.config.passToClient ?? [])
    .flat()
    // Vike's Config type also takes { prop, once }, which its resolved type leaves out
    .map((prop: string | { prop: string }) => (typeof prop === "string" ? prop : prop.prop))
    // The top-level key: 'user' for 'user.id', and '\\.' is a dot in a key
    .map((prop) => prop.split(/(?<!\\)\./)[0]!.replace(/\\\./g, "."));
  return { json: getPageContextJson(pageContext), keys: [...VIKE_PASSED_TO_CLIENT, ...keys] };
}
