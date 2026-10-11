import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import type { PageContext } from "vike/types";

// Every client component renders inside PageContextProvider: the browser's Root, the HTML render and Head
const Context = createContext<PageContext>(undefined!);

export function PageContextProvider({ pageContext, children }: { pageContext: PageContext; children: ReactNode }): ReactElement {
  return <Context value={pageContext}>{children}</Context>;
}

/** The pageContext, in a client component */
export function usePageContext(): PageContext {
  return useContext(Context);
}

export function getPageContext(): PageContext {
  throw new Error("[vike-react-rsc] getPageContext() is for server components and server actions: call usePageContext() in a client component");
}
