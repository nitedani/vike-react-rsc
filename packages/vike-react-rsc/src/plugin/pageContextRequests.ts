import type { DevEnvironment, Plugin } from "vite";
import { isClientDefault } from "./componentConfigs";
import { getFile } from "./parse";
import { decideIsServerComponent, getEnvironmentContext, getModule, resolveImport, type Context } from "./serverComponentImports";
import {
  getPageConfigs,
  getPagePartImports,
  hasAppServerHook,
  isVikeVirtualModule,
  setNeedsPageContextRequest,
  type PageConfig,
  type PageConfigs,
} from "./vikeParts";

/** Under `'client'`, a client navigation asks the server only for a page that renders a server component or has a hook that can
 * run there. Decided before Vike serializes the pages' configs, and again when a file it read changes */
export function pageContextRequests(): Plugin {
  // The client env, in dev
  let client: DevEnvironment | undefined;
  // By page, whether it needs a pageContext request. Then, by Vike's page configs, the decision and the files read to take it
  let needsRequest = new Map<string, boolean>();
  const decisions = new WeakMap<PageConfigs, { decided: Promise<boolean>; read: Set<string> }>();
  // Whether a page changed since the last decision, whichever page configs that was for
  const decideRequests = (pageConfigs: PageConfigs, context: Context) => {
    const read = new Set<string>();
    const decided = decidePageContextRequests(pageConfigs, context, !!client, read).then((needs) => {
      const previous = needsRequest;
      needsRequest = needs;
      return [...needs].some(([pageId, value]) => previous.get(pageId) === !value);
    });
    decisions.set(pageConfigs, { decided, read });
    return decided;
  };
  const decideNewPageConfigs = async (context: Context) => {
    const pageConfigs = getPageConfigs();
    const decision = decisions.get(pageConfigs);
    if (decision) await decision.decided;
    // Vike reloads its page configs when a + file is added or removed, without reloading the browser
    else if ((await decideRequests(pageConfigs, context)) && client) reloadPageConfigs(client);
  };
  return {
    name: "vike-react-rsc:page-context-requests",
    enforce: "pre",
    configureServer: (server) => {
      client = server.environments.client;
    },
    // Before Vike's load, which serializes the pages' configs
    async load(id) {
      if (isVikeVirtualModule(id)) await decideNewPageConfigs(this);
    },
    // After Vike's load, which waits for the page configs of a + file that was just added or removed
    async transform(_code, id) {
      if (isVikeVirtualModule(id)) await decideNewPageConfigs(this);
    },
    // Before placement's reload, which loads what this decides
    async hotUpdate({ type, file, read }) {
      const { environment } = this;
      if (type === "delete" || environment.name !== "client") return;
      const pageConfigs = getPageConfigs();
      if (!decisions.get(pageConfigs)?.read.has(file)) return;
      const context = getEnvironmentContext(environment);
      getModule(context, file, read);
      if (await decideRequests(pageConfigs, context)) reloadPageConfigs(environment);
    },
  };
}

// By page, whether it needs the request
async function decidePageContextRequests(pageConfigs: PageConfigs, context: Context, isDev: boolean, read: Set<string>): Promise<Map<string, boolean>> {
  return new Map(
    await Promise.all(
      pageConfigs.map(async (pageConfig) => {
        // A check that fails keeps the request, which is always safe. An invalid `components` is reported where it is used
        const needs = await needsPageContextRequest(pageConfig, context, isDev, read).catch(() => true);
        setNeedsPageContextRequest(pageConfig, needs);
        return [pageConfig.pageId, needs] as const;
      })
    )
  );
}

// An open tab holds what Vike serialized of the pages' configs, in the page entries too: it starts over
function reloadPageConfigs(environment: DevEnvironment) {
  for (const mod of environment.moduleGraph.idToModuleMap.values()) if (isVikeVirtualModule(mod.id)) environment.moduleGraph.invalidateModule(mod);
  environment.hot.send({ type: "full-reload" });
}

async function needsPageContextRequest(pageConfig: PageConfig, context: Context, isDev: boolean, read: Set<string>): Promise<boolean> {
  const clientDefault = isClientDefault();
  // Under 'server', each page renders from its Flight. And a browser error fetches the error page's pageContext from the server
  if (!clientDefault || pageConfig.isErrorPage || hasAppServerHook(pageConfig, isDev)) return true;
  for (const { appFile, importPath, importer } of getPagePartImports(pageConfig)) {
    // As the browser resolves it: its file says where a package's component runs
    const id = appFile ?? (importPath && (await resolveImport(context, importPath, importer)));
    if (!id) continue;
    const file = getFile(id);
    const { directives } = await getModule(context, file);
    const decision = await decideIsServerComponent(file, directives, [], clientDefault, context);
    for (const readFile of decision.read) read.add(readFile);
    if (decision.isServerComponent) return true;
  }
  return false;
}
