import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "rsc", "Invalid environment");

export { usePageContext };
export { getPageContext };
export { providePageContext };

import { getGlobalObject } from "../../utils/getGlobalObject.js";
import type { PageContext } from "vike/types";
import { AsyncLocalStorage } from "async_hooks";

const globalObject = getGlobalObject("PageContextProviderRsc.ts", {
  reactContextRsc: new AsyncLocalStorage<PageContext>(),
});

function providePageContext<T>(pageContext: PageContext, callback: () => T): T {
  const { reactContextRsc } = globalObject;
  return reactContextRsc.run(pageContext, callback);
}

function getPageContext(): PageContext {
  const { reactContextRsc } = globalObject;
  return reactContextRsc.getStore()!;
}

function usePageContext(): PageContext {
  throw new Error(
    "Cannot use usePageContext in a server component or action. Import getPageContext instead."
  );
}
