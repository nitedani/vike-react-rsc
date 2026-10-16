import type { PageContextServer } from "vike/types";
import { isRenderingServerComponents } from "../rsc/scope";

export type CookieOptions = {
  path?: string;
  domain?: string;
  /** In seconds */
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  partitioned?: boolean;
};

/** The request's cookies; `set()` and `delete()` answer with a `Set-Cookie` header */
export type Cookies = {
  /** The cookie's value: the one set earlier in this request, else the request's */
  get(name: string): string | undefined;
  /** Every cookie by name, as `get()` sees them */
  getAll(): Record<string, string>;
  has(name: string): boolean;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: Pick<CookieOptions, "path" | "domain">): void;
};

export function createCookies(pageContext: PageContextServer): Cookies {
  // The request's cookies, then the ones set in this request
  function readCookies(): Map<string, string> {
    const all = new Map<string, string>();
    for (const pair of pageContext.headers?.cookie?.split(";") ?? []) {
      const [name, value] = splitPair(pair);
      if (name && !all.has(name)) all.set(name, value);
    }
    // Also those set before a `throw render()`: Vike keeps them on the pageContexts it aborted
    for (const { headersResponse } of [...pageContext.pageContextsAborted, pageContext]) {
      for (const setCookie of headersResponse?.getSetCookie() ?? []) {
        const [name, value] = splitPair(setCookie.split(";", 1)[0]);
        if (/;\s*max-age=0\s*(;|$)/i.test(setCookie)) all.delete(name);
        else all.set(name, value);
      }
    }
    return all;
  }

  const cookies: Cookies = {
    get(name) {
      return readCookies().get(name);
    },
    getAll() {
      return Object.fromEntries(readCookies());
    },
    has(name) {
      return readCookies().has(name);
    },
    set(name, value, options = {}) {
      // A server component inside <Suspense> renders after the response's headers are sent, so its cookie would get
      // lost depending on where it sits
      if (isRenderingServerComponents()) {
        throw new Error(
          "[vike-react-rsc] pageContext.cookies.set() and delete() can't run while server components render: call them in a server action, or in a hook such as guard() or data()"
        );
      }
      pageContext.headersResponse.append("set-cookie", serialize(name, value, options));
    },
    delete(name, options) {
      cookies.set(name, "", { ...options, maxAge: 0 });
    },
  };
  return cookies;
}

function splitPair(pair: string): [string, string] {
  const at = pair.indexOf("=");
  const value = at === -1 ? "" : pair.slice(at + 1).trim();
  return [(at === -1 ? pair : pair.slice(0, at)).trim(), decode(value)];
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function serialize(name: string, value: string, options: CookieOptions): string {
  let setCookie = `${name}=${encodeURIComponent(value)}`;
  if (options.path) setCookie += `; Path=${options.path}`;
  if (options.domain) setCookie += `; Domain=${options.domain}`;
  if (options.maxAge !== undefined) setCookie += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.expires) setCookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) setCookie += "; HttpOnly";
  if (options.secure) setCookie += "; Secure";
  if (options.sameSite) setCookie += `; SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`;
  if (options.partitioned) setCookie += "; Partitioned";
  return setCookie;
}
