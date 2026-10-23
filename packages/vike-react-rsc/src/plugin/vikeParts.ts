import path from "node:path";
import { getVikeConfig } from "vike/plugin";

/** Each import Vike loads a Page, Layout, Wrapper or Loading from, the same array until Vike replaces its page configs on a change.
 * Vike's public config names a value's file only as a display string, so this reads its internal page configs */
export function getPartImports(): PartImport[] {
  const { _pageConfigs } = getVikeConfig().dangerouslyUseInternals;
  let parts = partImports.get(_pageConfigs);
  if (!parts) partImports.set(_pageConfigs, (parts = readPartImports(_pageConfigs)));
  return parts;
}

function readPartImports(pageConfigs: PageConfigs): PartImport[] {
  return pageConfigs.flatMap(({ configValueSources }) =>
    ["Page", "Layout", "Wrapper", "Loading"].flatMap((configName) =>
      (configValueSources[configName] ?? []).flatMap((source) => getImports(source).map((part) => ({ ...part, configName })))
    )
  );
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

type PageConfigs = ReturnType<typeof getVikeConfig>["dangerouslyUseInternals"]["_pageConfigs"];
type ConfigValueSource = PageConfigs[number]["configValueSources"][string][number];
/** The app's own file, or an import of a package or through a path alias and the file that imports it */
export type PartImport = { configName: string; appFile?: string; importPath?: string; importer?: string; exportName?: string };
// By Vike's page configs, which it replaces when a config changes
const partImports = new WeakMap<object, PartImport[]>();
