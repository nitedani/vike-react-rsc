import type * as React from "react";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import type { PageContext, PageContextServer } from "vike/types";
import { getShared } from "./shared";

const Context: React.Context<PageContext> = getShared("pageContext", () => createContext<PageContext>(undefined!));

export function PageContextProvider({ pageContext, children }: { pageContext: PageContext; children: ReactNode }): ReactElement {
  return <Context value={pageContext}>{children}</Context>;
}

/** The pageContext, in a client component */
export function usePageContext(): PageContext {
  return useContext(Context);
}

/** The pageContext, in a server component or a server action */
export function getPageContext(): PageContextServer {
  throw new Error("[vike-react-rsc] getPageContext() is for server components and server actions: call usePageContext() in a client component");
}
