import type { PageContextServer } from "vike/types";

// Only while the request has a visitor cookie
export function onCreatePageContext(pageContext: PageContextServer): void {
  // On demand, while the e2e sets this cookie
  if (pageContext.headers?.cookie?.includes("failOnCreatePageContext=1")) throw new Error("+onCreatePageContext failed on demand");
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
