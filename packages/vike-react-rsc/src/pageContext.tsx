import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import type { PageContext } from "vike/types";

// Every client component renders inside PageContextProvider: the browser's Root, the HTML render and Head. Every copy of
// this package, e.g. a library's own, shares it.
const shared = globalThis as { [key: symbol]: ReturnType<typeof createContext<PageContext>> | undefined };
const Context = (shared[Symbol.for("vike-react-rsc:pageContext")] ??= createContext<PageContext>(undefined!));

export function PageContextProvider({ pageContext, children }: { pageContext: PageContext; children: ReactNode }): ReactElement {
  return <Context value={pageContext}>{children}</Context>;
}

/** The pageContext, in a client component */
export function usePageContext(): PageContext {
  return useContext(Context);
}

/** The pageContext, in a server component or a server action */
export function getPageContext(): PageContext {
  throw new Error("[vike-react-rsc] getPageContext() is for server components and server actions: call usePageContext() in a client component");
}
