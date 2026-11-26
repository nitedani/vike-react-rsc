import { parse } from "@brillout/json-serializer/parse";
import { stringify } from "@brillout/json-serializer/stringify";
import { redirect, render } from "vike/abort";

// A `throw redirect()` or `throw render()` in a server component crosses the Flight as the error's digest: in
// production, React keeps nothing else of an error
const DIGEST_PREFIX = "vike-react-rsc:abort:";

type StatusCode = 401 | 403 | 404 | 410 | 429 | 500 | 503;
export type Abort =
  | { redirect: { url: string; statusCode: 301 | 302 } }
  | { rewrite: `/${string}`; reason?: unknown }
  | { statusCode: StatusCode; reason?: unknown };

/** The rsc env: the digest that carries `abort` across the Flight */
export function getAbortDigest(abort: Abort): string {
  return DIGEST_PREFIX + serialize(abort);
}

/** The ssr env and the browser: what an error decoded from the Flight asks for, if it's a Vike abort */
export function getAbort(error: unknown): Abort | undefined {
  const digest = typeof error === "object" && error !== null && "digest" in error ? error.digest : undefined;
  if (typeof digest !== "string" || !digest.startsWith(DIGEST_PREFIX)) return;
  return parse(digest.slice(DIGEST_PREFIX.length)) as Abort;
}

/** The ssr env and the browser: the same abort, for Vike to answer as one of its own */
export function toVikeAbort(abort: Abort): Error {
  if ("redirect" in abort) return redirect(abort.redirect.url, abort.redirect.statusCode);
  if ("rewrite" in abort) return render(abort.rewrite, abort.reason as string);
  return render(abort.statusCode, abort.reason as string);
}

// With Vike's serializer, as the abortReason of a guard(): a Date stays a Date
function serialize(abort: Abort): string {
  try {
    return stringify(abort, { forbidReactElements: true });
  } catch (error) {
    // As Vike does with an abortReason it can't send to the browser: it warns and sends the rest
    console.warn("[vike-react-rsc] The page gets no abortReason: it can't be serialized.", error);
    return stringify({ ...abort, reason: undefined });
  }
}
