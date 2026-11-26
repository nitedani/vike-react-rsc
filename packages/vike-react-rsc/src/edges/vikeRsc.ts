// Vike's private names that the rsc env reads. No import: the rsc env loads none of Vike's internals.
import type { PageContext } from "vike/types";
import type { Abort } from "../abort";

/** What renderPage() got from the server and every middleware, until Vike has a public name for it:
 * https://github.com/nitedani/vike-react-rsc/issues/48 */
export function getPageContextInit(pageContext: PageContext): Record<string, unknown> {
  return (pageContext as PageContext & { _pageContextInit: Record<string, unknown> })._pageContextInit;
}

/** The redirect or render that `error` asks for, if it's Vike's `throw redirect()` or `throw render()` */
// TODO: use AbortError from vike/abort once it exists: https://github.com/vikejs/vike/issues/1707#issuecomment-6231396862
export function readVikeAbort(error: unknown): Abort | undefined {
  if (typeof error !== "object" || error === null) return;
  if (!("_isAbortError" in error && "_pageContextAbort" in error)) return;
  const { _urlRedirect, _urlRewrite, abortStatusCode, abortReason } = (error as VikeAbortError)._pageContextAbort;
  if (_urlRedirect) return { redirect: { url: _urlRedirect.url, statusCode: _urlRedirect.statusCode } };
  if (_urlRewrite) return { rewrite: _urlRewrite, reason: abortReason };
  return { statusCode: abortStatusCode!, reason: abortReason };
}
type VikeAbortError = {
  _pageContextAbort: {
    _urlRedirect?: { url: string; statusCode: 301 | 302 };
    _urlRewrite?: `/${string}`;
    abortStatusCode?: Extract<Abort, { statusCode: unknown }>["statusCode"];
    abortReason?: unknown;
  };
};
