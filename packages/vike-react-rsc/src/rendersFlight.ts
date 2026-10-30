import type { PageContext } from "vike/types";

/** Vike's configs whose value is a component, in the order they wrap the page */
export const componentConfigNames = ["Page", "Layout", "Wrapper", "Loading"] as const;

/** Whether the page renders from its Flight: every page under `components: 'server'`, and under `components: 'client'` a
 * page whose Page, Layouts, Wrappers or Loading include a server component. Any other page renders as in vike-react. */
export function rendersFlight(pageContext: PageContext): boolean {
  return pageContext.config.components !== "client" || findServerComponent(pageContext) !== undefined;
}

/** Under `components: 'client'`, the page's first Page, Layout, Wrapper or Loading that is a server component: in the rsc env
 * the plugin flags it, outside it the plugin's stub replaces it */
export function findServerComponent(pageContext: PageContext): { file: string; serverComponentImport?: string[] } | undefined {
  return getComponentConfigValues(pageContext).find((component) => "isServerComponent" in component) as
    | { file: string; serverComponentImport?: string[] }
    | undefined;
}

/** The files from each of the page's Page, Layouts, Wrappers or Loading that is a server component because it imports one, to
 * that server component */
export function getServerComponentImports(pageContext: PageContext): string[][] {
  return getComponentConfigValues(pageContext).flatMap((component) => {
    const { serverComponentImport } = component as { serverComponentImport?: string[] };
    return serverComponentImport ? [serverComponentImport] : [];
  });
}

function getComponentConfigValues(pageContext: PageContext): object[] {
  return componentConfigNames.flatMap((configName): object | object[] => pageContext.config[configName] ?? []);
}
