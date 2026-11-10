import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { componentConfigNames } from "../rendersFlight";

const PAGE_ENTRY = "\0virtual:vike:page-entry:";
// vike-react-rsc's own server hook, as its config imports it
const OWN_SERVER_HOOK = "vike-react-rsc/__internal/ssr";

/** Each import Vike loads a Page, Layout, Wrapper or Loading from, the same array until Vike replaces its page configs on a change.
 * Vike's public config names a value's file only as a display string, so this reads its internal page configs */
export function getPartImports(): PartImport[] {
  const pageConfigs = getPageConfigs();
  let parts = partImports.get(pageConfigs);
  if (!parts) partImports.set(pageConfigs, (parts = pageConfigs.flatMap(getPagePartImports)));
  return parts;
}

export function getPageConfigs(): PageConfigs {
  return getVikeConfig().dangerouslyUseInternals._pageConfigs;
}

/** Each import Vike loads a Page, Layout, Wrapper or Loading of the page from */
export function getPagePartImports({ configValueSources }: PageConfig): PartImport[] {
  return componentConfigNames.flatMap((configName) =>
    (configValueSources[configName] ?? []).flatMap((source) => getImports(source).map((part) => ({ ...part, configName })))
  );
}

// The hooks that Vike can run on the server for a client navigation
const serverHookNames = ["data", "onBeforeRender", "onCreatePageContext", "guard"];

/** Whether the page has a hook that Vike runs on the server for a client navigation, vike-react-rsc's own left out. A universal
 * one counts too: it runs on the server while Vike asks the server for the page, so it can read what only the server has */
export function hasAppServerHook(pageConfig: PageConfig): boolean {
  return serverHookNames.some((hookName) => {
    // The environment Vike resolved, from the file name or `meta`, of the value that applies: the first one of a non-cumulative hook
    const sources = (pageConfig.configValueSources[hookName] ?? []).filter((source) => source.configEnv.server && !isOwnHook(source));
    const applied = pageConfig.configDefinitions[hookName]?.cumulative ? sources : sources.slice(0, 1);
    // A `.ssr` hook doesn't run for a navigation, and null removes an inherited hook
    return applied.some((source) => {
      const isSsr = "fileName" in source.definedAt && !!source.definedAt.fileName?.includes(".ssr.");
      return !isSsr && !(source.valueIsLoaded && source.value === null);
    });
  });
}

function isOwnHook({ definedAt }: ConfigValueSource): boolean {
  return "importPathAbsolute" in definedAt && definedAt.importPathAbsolute === OWN_SERVER_HOOK;
}

/** Sets whether a client navigation to the page asks the server for its pageContext: Vike asks for a page with a `.server` hook, and
 * runs a `.ssr` one only to render the HTML */
export function setNeedsPageContextRequest({ pageId }: PageConfig, needsRequest: boolean): void {
  const { config } = getVikeConfig().pages[pageId]!;
  // Vike's type of a page's config has no import strings
  (config as { onCreatePageContext?: unknown }).onCreatePageContext = needsRequest
    ? "import:vike-react-rsc/__internal/ssr:onCreatePageContext"
    : "import:vike-react-rsc/__internal/ssr.ssr:onCreatePageContext";
}

/** Whether `importer` is the virtual module Vike loads a page's + files from */
export function isPageEntry(importer: string | undefined): boolean {
  return !!importer?.startsWith(PAGE_ENTRY);
}

/** The rsc env's page entry of the page whose client page entry is `id`, if it is one */
export function getRscPageEntry(id: string | null): string | undefined {
  if (id?.startsWith(`${PAGE_ENTRY}client:`)) return `${PAGE_ENTRY}rsc:${id.slice(`${PAGE_ENTRY}client:`.length)}`;
}

/** Whether the module is one of Vike's virtual modules, which hold what it serializes of the page configs */
export function isVikeVirtualModule(id: string | null): boolean {
  return !!id?.startsWith("\0virtual:vike:");
}

/** Each import Vike loads a component from: the value's own, or each import string in the value, e.g. Loading: { layout }.
 * Either the app's own file, or an import of a package or through a path alias */
function getImports(source: ConfigValueSource): Omit<PartImport, "configName">[] {
  const { definedAt } = source;
  if (!("filePathAbsoluteFilesystem" in definedAt)) return [];
  if (source.valueLoadedViaImport) {
    const { filePathAbsoluteFilesystem: file, importPathAbsolute: importPath, fileExportName: exportName } = definedAt;
    const importer = source.plusFile?.filePath.filePathAbsoluteFilesystem ?? undefined;
    return [importPath ? { importPath, importer, exportName } : { appFile: file ?? undefined, exportName }];
  }
  if (!source.valueIsLoaded) return [];
  const importer = definedAt.filePathAbsoluteFilesystem ?? undefined;
  return getPointerImports(source.value).map(({ importPath, exportName }) =>
    // Vike makes a +config file's relative import absolute
    path.isAbsolute(importPath) ? { appFile: importPath, exportName } : { importPath, importer, exportName }
  );
}

// The import strings in a value: an extension's, or the one Vike makes of a +config file's import, e.g. "import:/app/Spinner.tsx:Spinner"
function getPointerImports(value: unknown): { importPath: string; exportName: string }[] {
  if (typeof value === "string") {
    const parts = value.replace(/^\u200b/, "").split(":");
    if (parts[0] !== "import" || parts.length < 2) return [];
    return parts.length === 2 ? [{ importPath: parts[1]!, exportName: "default" }] : [{ importPath: parts.slice(1, -1).join(":"), exportName: parts.at(-1)! }];
  }
  return value && typeof value === "object" ? Object.values(value).flatMap(getPointerImports) : [];
}

export type PageConfigs = ReturnType<typeof getVikeConfig>["dangerouslyUseInternals"]["_pageConfigs"];
export type PageConfig = PageConfigs[number];
type ConfigValueSource = PageConfig["configValueSources"][string][number];
/** The app's own file, or an import of a package or through a path alias and the file that imports it */
export type PartImport = { configName: string; appFile?: string; importPath?: string; importer?: string; exportName?: string };
// By Vike's page configs, which it replaces when a config changes
const partImports = new WeakMap<object, PartImport[]>();
