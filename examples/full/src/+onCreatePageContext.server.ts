import { redirect, render } from "vike/abort";
import type { PageContextServer } from "vike/types";

const aborted = new Set<string>();

// Only while the request has a visitor cookie
export function onCreatePageContext(pageContext: PageContextServer): void {
  // On demand, while the e2e sets this cookie
  if (pageContext.headers?.cookie?.includes("failOnCreatePageContext=1")) throw new Error("+onCreatePageContext failed on demand");
  // Once per cookie value: render() makes Vike create the next page's pageContext for the same request
  const abort = pageContext.headers?.cookie?.match(/(?:^|;\s*)abortOnCreatePageContext=(render|redirect)-([^;]*)/);
  if (abort && !aborted.has(abort[2]!)) {
    aborted.add(abort[2]!);
    throw abort[1] === "render" ? render("/login") : redirect("/");
  }
  const visitor = pageContext.headers?.cookie?.match(/(?:^|;\s*)visitor=([^;]*)/)?.[1];
  if (visitor) pageContext.visitor = visitor;
}

declare global {
  namespace Vike {
    interface PageContext {
      visitor?: string;
    }
  }
}
