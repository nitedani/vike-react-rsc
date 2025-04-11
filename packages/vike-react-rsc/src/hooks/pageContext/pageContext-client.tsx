import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "client" || envName === "rsc", "Invalid environment");

export { usePageContext };
export { getPageContext };
export { PageContextProvider };

import React, { useContext } from "react";
import { getGlobalObject } from "../../utils/getGlobalObject.js";
import type { PageContext } from "vike/types";

const globalObject = getGlobalObject("PageContextProvider.ts", {
  reactContext: React.createContext<PageContext>(undefined as never),
});

function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: PageContext;
  children: React.ReactNode;
}): React.ReactElement {
  const { reactContext } = globalObject;
  return (
    <reactContext.Provider value={pageContext}>
      {children}
    </reactContext.Provider>
  );
}

function usePageContext(): PageContext {
  const { reactContext } = globalObject;
  const pageContext = useContext(reactContext);
  return pageContext;
}

function getPageContext(): PageContext {
  throw new Error(
    "Cannot use getPageContext in a client component. Import usePageContext instead."
  );
}
