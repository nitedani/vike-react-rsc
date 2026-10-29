import type { PageContextServer } from "vike/types";

// E.g. a value and a getter derived from it, as an extension may define
export function onCreatePageContext(pageContext: PageContextServer) {
  pageContext.locale = "en";
  Object.defineProperty(pageContext, "localeLabel", {
    get(this: PageContextServer) {
      return `Locale ${this.locale}`;
    },
    enumerable: true,
    configurable: true,
  });
  // E.g. a getter reading config: Vike runs it on the server env's pageContext, whose config has no `components`
  Object.defineProperty(pageContext, "componentsLabel", {
    get(this: PageContextServer) {
      return `Components ${this.config.components}`;
    },
    enumerable: true,
    configurable: true,
  });
}

declare global {
  namespace Vike {
    interface PageContext {
      locale?: string;
      localeLabel?: string;
      componentsLabel?: string;
    }
  }
}
