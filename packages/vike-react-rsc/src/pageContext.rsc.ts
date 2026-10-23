import type { PageContext } from "vike/types";
import { readPageContext } from "./rsc/scope";

export { getPageContext } from "./rsc/scope";

export function usePageContext(): PageContext {
  return readPageContext("usePageContext()");
}
