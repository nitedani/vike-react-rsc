import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";

export function guard(pageContext: PageContextServer) {
  if (!pageContext.cookies.get("session")) throw render("/login");
}
