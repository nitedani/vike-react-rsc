import type { PageContextServer } from "vike/types";
import { rerender } from "vike-react-rsc/server";
import { getError } from "./getError";

// A Vike hook runs outside the rsc env
export function data(pageContext: PageContextServer) {
  return { rerender: getError(rerender), setCookie: getError(() => pageContext.cookies.set("misuse", "1")) };
}
