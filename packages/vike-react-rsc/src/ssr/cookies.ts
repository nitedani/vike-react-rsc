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
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: Pick<CookieOptions, "path" | "domain">): void;
};

export function createCookies(pageContext: PageContextServer): Cookies {
  const cookies: Cookies = {
    get(name) {
      const setCookie = pageContext.headersResponse.getSetCookie().findLast((line) => getName(line) === name);
      if (setCookie !== undefined) {
        return /;\s*max-age=0\s*(;|$)/i.test(setCookie) ? undefined : decode(setCookie.slice(name.length + 1).split(";", 1)[0]);
      }
      for (const pair of pageContext.headers?.cookie?.split(";") ?? []) {
        if (getName(pair.trim()) === name) return decode(pair.trim().slice(name.length + 1));
      }
      return undefined;
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

function getName(pair: string): string {
  return pair.split("=", 1)[0];
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
