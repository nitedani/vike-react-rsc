import path from "node:path";
import { getVikeConfig } from "vike/plugin";
import { componentConfigNames } from "../rendersFlight";

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

/** Whether the page has a hook that Vike runs on the server for a client navigation, vike-react-rsc's own left out. A universal
 * one counts too: it runs on the server while Vike asks the server for the page, so it can read what only the server has */
export function hasAppServerHook(pageConfig: PageConfig, isDev: boolean): boolean {
  const configValueSources = Object.fromEntries(
    Object.entries(pageConfig.configValueSources).map(([configName, sources]) => [configName, sources.filter((source) => !isOwnHook(source)).map(asServerOnly)])
  );
  // Not false also when Vike no longer has this rule: the page keeps the request
  return pageConfig.configDefinitions.hasServerOnlyHook?._computed?.({ ...pageConfig, configValueSources }, isDev) !== false;
}

function isOwnHook({ definedAt }: ConfigValueSource): boolean {
  return "importPathAbsolute" in definedAt && definedAt.importPathAbsolute === OWN_SERVER_HOOK;
}

function asServerOnly(source: ConfigValueSource): ConfigValueSource {
  return source.configEnv.server ? { ...source, configEnv: { ...source.configEnv, client: false } } : source;
}

/** Sets whether a client navigation to the page asks the server for its pageContext */
export function setNeedsPageContextRequest(pageConfig: PageConfig, needsRequest: boolean): void {
  // TODO: replace with a public per-page setter in Vike: https://github.com/vikejs/vike/issues/3730. Vike makes the request for a page with a server-only hook, and an extension can't say which of its pages need its own hook
  const computed = pageConfig.configValuesComputed.hasServerOnlyHook;
  if (computed) computed.value = needsRequest;
}

/** Whether `importer` is the virtual module Vike loads a page's + files from */
export function isPageEntry(importer: string | undefined): boolean {
  return !!importer?.startsWith("\0virtual:vike:page-entry:");
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
