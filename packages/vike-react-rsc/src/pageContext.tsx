import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import type { PageContext } from "vike/types";

const reactContext = createContext<PageContext>(undefined as never);

export function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: PageContext;
  children: ReactNode;
}): ReactElement {
  return <reactContext.Provider value={pageContext}>{children}</reactContext.Provider>;
}

export function usePageContext(): PageContext {
  return useContext(reactContext);
}

export function getPageContext(): PageContext {
  throw new Error("[vike-react-rsc] Cannot use getPageContext in a client component. Import usePageContext instead.");
}
