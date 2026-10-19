import type { PageContextServer } from "vike/types";

// Only while the request has a visitor cookie
export function onCreatePageContext(pageContext: PageContextServer): void {
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
