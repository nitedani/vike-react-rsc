import type { PageContextServer } from "vike/types";

// On demand, while the e2e sets this cookie: a server error that the error page's Try again may get past
export function data(pageContext: PageContextServer) {
  if (pageContext.cookies.has("failData")) throw new Error("data() failed on demand");
}
