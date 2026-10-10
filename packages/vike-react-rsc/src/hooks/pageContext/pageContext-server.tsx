export { getPageContext } from "../../rsc/scope";

import type { PageContext } from "vike/types";

export function usePageContext(): PageContext {
  throw new Error(
    "Cannot use usePageContext in a server component or action. Import getPageContext instead."
  );
}
