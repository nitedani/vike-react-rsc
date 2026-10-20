import type { PageContextServer } from "vike/types";

// E.g. a store the components read while they render to HTML, as vike-react-redux creates
export function onBeforeRenderHtml(pageContext: PageContextServer) {
  pageContext.store = { greeting: "A store +onBeforeRenderHtml created" };
}

declare global {
  namespace Vike {
    interface PageContext {
      store?: { greeting: string };
    }
  }
}
