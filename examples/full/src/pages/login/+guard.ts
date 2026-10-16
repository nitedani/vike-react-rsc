import { redirect } from "vike/abort";
import type { PageContextServer } from "vike/types";

// A logged-in user has nothing to do here
export function guard(pageContext: PageContextServer) {
  if (pageContext.cookies.get("session")) throw redirect("/account");
}
