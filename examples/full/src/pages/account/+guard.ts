import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getSession } from "./getSession";

export function guard(pageContext: PageContextServer) {
  if (!getSession(pageContext.headers)) throw render("/login");
}
