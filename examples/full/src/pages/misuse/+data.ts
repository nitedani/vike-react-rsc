import type { PageContextServer } from "vike/types";
import { rerender } from "vike-react-rsc/server";
import { getError } from "./getError";

// A Vike hook runs outside the rsc env
export function data(pageContext: PageContextServer) {
  const setCookie = getError(() => pageContext.cookies.set("misuse", "1"));
  // What the next hooks of this request read
  const { cookies } = pageContext;
  return { rerender: getError(rerender), setCookie, cookieSeen: `${cookies.has("misuse")} ${cookies.getAll().misuse}` };
}
