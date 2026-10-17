import { redirect, render } from "vike/abort";

// A `throw redirect()` or `throw render()` in a server component crosses the Flight as the error's digest: in
// production, React keeps nothing else of an error
const DIGEST_PREFIX = "vike-react-rsc:abort:";

type StatusCode = 401 | 403 | 404 | 410 | 429 | 500 | 503;
export type Abort =
  | { redirect: { url: string; statusCode: 301 | 302 } }
  | { rewrite: `/${string}` }
  | { statusCode: StatusCode; reason?: unknown };

/** The rsc env: the digest of a Vike abort, else undefined */
export function getAbortDigest(error: unknown): string | undefined {
  const abort = readVikeAbort(error);
  return abort && DIGEST_PREFIX + JSON.stringify(abort);
}

/** The ssr env and the browser: what an error decoded from the Flight asks for, if it's a Vike abort */
export function getAbort(error: unknown): Abort | undefined {
  const digest = typeof error === "object" && error !== null && "digest" in error ? error.digest : undefined;
  if (typeof digest !== "string" || !digest.startsWith(DIGEST_PREFIX)) return;
  return JSON.parse(digest.slice(DIGEST_PREFIX.length)) as Abort;
}

/** The ssr env: the same abort, for a hook to throw so that Vike answers it */
export function toVikeAbort(abort: Abort): Error {
  if ("redirect" in abort) return redirect(abort.redirect.url, abort.redirect.statusCode);
  if ("rewrite" in abort) return render(abort.rewrite);
  return render(abort.statusCode, abort.reason as string);
}

// TODO: use getAbortInfo() from vike/abort once <VIKE_PR_URL> is released
function readVikeAbort(error: unknown): Abort | undefined {
  if (typeof error !== "object" || error === null) return;
  if (!("_isAbortError" in error && "_pageContextAbort" in error)) return;
  const { _urlRedirect, _urlRewrite, abortStatusCode, abortReason } = (error as VikeAbortError)._pageContextAbort;
  if (_urlRedirect) return { redirect: { url: _urlRedirect.url, statusCode: _urlRedirect.statusCode } };
  if (_urlRewrite) return { rewrite: _urlRewrite };
  return { statusCode: abortStatusCode!, reason: abortReason };
}
type VikeAbortError = {
  _pageContextAbort: {
    _urlRedirect?: { url: string; statusCode: 301 | 302 };
    _urlRewrite?: `/${string}`;
    abortStatusCode?: StatusCode;
    abortReason?: unknown;
  };
};
