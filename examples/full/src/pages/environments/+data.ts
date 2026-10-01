import type { PageContextServer } from "vike/types";

// Runs in the server environment (ssr)
export function data(pageContext: PageContextServer) {
  return { greetingReadBySsr: pageContext.config.greeting };
}
