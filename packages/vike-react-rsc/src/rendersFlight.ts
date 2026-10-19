import type { PageContext } from "vike/types";

/** Whether the page renders from its Flight: every page under `components: 'server'`, and under `components: 'client'` a
 * page whose Page, Layouts or Wrappers include a server component. Any other page renders as in vike-react. */
export function rendersFlight(pageContext: PageContext): boolean {
  const { components, Page, Layout = [], Wrapper = [] } = pageContext.config;
  return components !== "client" || [Page, ...Layout, ...Wrapper].some((component) => component && "isServerComponent" in component);
}
