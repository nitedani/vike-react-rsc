import type { PageContext } from "vike/types";
import { getPageContext } from "./rsc/scope";

export { getPageContext };

export function usePageContext(): PageContext {
  return getPageContext();
}
