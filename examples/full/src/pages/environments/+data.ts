import type { PageContextServer } from "vike/types";

export function data(pageContext: PageContextServer) {
  return { greetingReadBySsr: pageContext.environments.rsc.config.greeting };
}
