import type { OnCreatePageConfig } from "vike/types";
import { isClientDefault } from "./componentConfigs";
import { getFile } from "./parse";
import { decideIsServerComponent } from "./placement";
import { getModuleOfCode, resolveImport, type GetModule } from "./serverComponentImports";
import { getPageConfigs, getPagePartImports, type PageConfig } from "./vikeParts";

type Page = Parameters<OnCreatePageConfig>[0];
type Context = Parameters<OnCreatePageConfig>[1];

// The hooks that Vike can run on the server for a client navigation
const serverHookNames = ["data", "onBeforeRender", "onCreatePageContext", "guard"];

/** vike-react-rsc's server onCreatePageContext hook, `.server` on a page whose client navigation needs it, so that Vike fetches its
 * pageContext from the server, and `.ssr` elsewhere */
export const onCreatePageConfig: OnCreatePageConfig = async (page, ctx) => {
  // A check that fails keeps the request, which is always safe. An invalid `components` is reported where it is used
  const needsRequest = await needsPageContextRequest(page, ctx).catch(() => true);
  return { onCreatePageContext: `import:vike-react-rsc/__internal/${needsRequest ? "ssr" : "ssr.ssr"}:onCreatePageContext` };
};

// Under 'client', a client navigation asks the server only for a page that renders a server component or has a hook that can run there
async function needsPageContextRequest(page: Page, ctx: Context): Promise<boolean> {
  // Under 'server', each page renders from its Flight. And a browser error fetches the error page's pageContext from the server
  if (!isClientDefault() || page.isErrorPage) return true;
  // Vike's page config without the hook's result, so without vike-react-rsc's own server hook
  const pageConfig = getPageConfigs().find(({ pageId }) => pageId === page.pageId)!;
  if (hasServerHook(pageConfig)) return true;
  const context = {
    resolve: async (source: string, importer?: string) => {
      const id = await ctx.resolve(source, importer);
      return id === undefined ? null : { id };
    },
  };
  const getModule: GetModule = (file) => getModuleOfCode(file, ctx.read, context);
  for (const { appFile, importPath, importer } of getPagePartImports(pageConfig)) {
    // As the browser resolves it: its file says where a package's component runs
    const id = appFile ?? (importPath && (await resolveImport(context, importPath, importer)));
    if (!id) continue;
    const file = getFile(id);
    const { directives } = await getModule(file);
    if ((await decideIsServerComponent(file, directives, [], getModule)).isServerComponent) return true;
  }
  return false;
}

/** Whether the page has a hook that Vike runs on the server for a client navigation. A universal one counts too, unlike for
 * page.hasServerOnlyHook: it runs on the server while Vike asks the server for the page, so it can read what only the server has */
function hasServerHook(pageConfig: PageConfig): boolean {
  return serverHookNames.some((hookName) => {
    // The environment Vike resolved, from the file name or `meta`, of the value that applies: the first one of a non-cumulative hook
    const sources = (pageConfig.configValueSources[hookName] ?? []).filter((source) => source.configEnv.server);
    const applied = pageConfig.configDefinitions[hookName]?.cumulative ? sources : sources.slice(0, 1);
    // A `.ssr` hook doesn't run for a navigation, and null removes an inherited hook
    return applied.some((source) => {
      const isSsr = "fileName" in source.definedAt && !!source.definedAt.fileName?.includes(".ssr.");
      return !isSsr && !(source.valueIsLoaded && source.value === null);
    });
  });
}
