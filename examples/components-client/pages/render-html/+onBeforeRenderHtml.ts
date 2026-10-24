import type { PageContextServer } from "vike/types";

// E.g. a store the HTML's client components and +Head read
export function onBeforeRenderHtml(pageContext: PageContextServer) {
  pageContext.store = { greeting: "A store +onBeforeRenderHtml created" };
  // E.g. the HTML's own locale
  pageContext.locale = "fr";
  // E.g. no user signed in
  pageContext.user = undefined;
}

declare global {
  namespace Vike {
    interface PageContext {
      user?: { name: string };
    }
  }
}
