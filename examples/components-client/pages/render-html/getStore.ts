import { getPageContext } from "vike-react-rsc/pageContext";

// Server components don't see the store +onBeforeRenderHtml creates for the HTML, as after a client navigation, which
// runs no such hook: they create their own
export function getStore(): { greeting: string } {
  return (getPageContext().store ??= { greeting: "A store a server component created" });
}

declare global {
  namespace Vike {
    interface PageContext {
      store?: { greeting: string };
      written?: string;
      writtenLater?: string;
    }
  }
}
