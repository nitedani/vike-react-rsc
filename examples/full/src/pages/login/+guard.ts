import { redirect } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getSession } from "../account/getSession";

// A logged-in user has nothing to do here
export function guard(pageContext: PageContextServer) {
  if (getSession(pageContext.headers)) throw redirect("/account");
}
