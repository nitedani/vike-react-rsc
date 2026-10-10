import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import type { PageContext } from "vike/types";
import { getGlobalObject } from "./utils/getGlobalObject.js";

const globalObject = getGlobalObject("pageContext.ts", {
  reactContext: createContext<PageContext>(undefined as never),
});

export function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: PageContext;
  children: ReactNode;
}): ReactElement {
  return <globalObject.reactContext.Provider value={pageContext}>{children}</globalObject.reactContext.Provider>;
}

export function usePageContext(): PageContext {
  return useContext(globalObject.reactContext);
}

export function getPageContext(): PageContext {
  throw new Error("Cannot use getPageContext in a client component. Import usePageContext instead.");
}
