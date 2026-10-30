import type { PageContext } from "vike/types";

/** Vike's configs whose value is a component, in the order they wrap the page */
export const componentConfigNames = ["Page", "Layout", "Wrapper", "Loading"] as const;

/** What the plugin puts on a Page, Layout, Wrapper or Loading that is a server component: on the component in the rsc env, on its
 * stub outside it. `serverComponentImport`: the files from it to the server component it imports, if that makes it one */
export type ServerComponentFlags = { isServerComponent: true; file: string; serverComponentImport?: string[] };

/** Whether the page renders from its Flight: every page under `components: 'server'`, and under `components: 'client'` a
 * page whose Page, Layouts, Wrappers or Loading include a server component. Any other page renders as in vike-react. */
export function rendersFlight(pageContext: PageContext): boolean {
  return pageContext.config.components !== "client" || findServerComponent(pageContext) !== undefined;
}

/** Under `components: 'client'`, the page's first Page, Layout, Wrapper or Loading that is a server component: in the rsc env
 * the plugin flags it, outside it the plugin's stub replaces it */
export function findServerComponent(pageContext: PageContext): ServerComponentFlags | undefined {
  return getComponentConfigValues(pageContext).find((component): component is ServerComponentFlags => "isServerComponent" in component);
}

/** The files from each of the page's Page, Layouts, Wrappers or Loading that is a server component because it imports one, to
 * that server component */
export function getServerComponentImports(pageContext: PageContext): string[][] {
  return getComponentConfigValues(pageContext).flatMap((component) => {
    const { serverComponentImport } = component as Partial<ServerComponentFlags>;
    return serverComponentImport ? [serverComponentImport] : [];
  });
}

function getComponentConfigValues(pageContext: PageContext): object[] {
  return componentConfigNames.flatMap((configName): object | object[] => pageContext.config[configName] ?? []);
}
