import type { PageContext } from "vike/types";

export { getPageContext } from "./rsc/scope";

export function usePageContext(): PageContext {
  throw new Error("[vike-react-rsc] usePageContext() is for client components: call getPageContext() in a server component or a server action");
}
