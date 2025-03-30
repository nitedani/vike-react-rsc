import { dangerouslySkipEscape } from "vike/server";
import type { PageContextServer } from "vike/types";

export function onRenderHtml(pageContext: PageContextServer) {
  console.log("onRenderHtml");
  return dangerouslySkipEscape("hi")
}
