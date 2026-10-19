import type { PageContext } from "vike/types";

/** Whether the page renders from its Flight: every page under `components: 'server'`, and under `components: 'client'` a
 * page whose Page, Layouts, Wrappers or Loading include a server component. Any other page renders as in vike-react. */
export function rendersFlight(pageContext: PageContext): boolean {
  return pageContext.config.components !== "client" || findServerComponent(pageContext) !== undefined;
}

/** Under `components: 'client'`, the page's first Page, Layout, Wrapper or Loading that is a server component: the plugin's
 * stub outside the rsc env */
export function findServerComponent(pageContext: PageContext): { file: string } | undefined {
  const { Page, Layout = [], Wrapper = [], Loading } = pageContext.config;
  return [Page, ...Layout, ...Wrapper, Loading].find((component) => component && "isServerComponent" in component) as { file: string } | undefined;
}
