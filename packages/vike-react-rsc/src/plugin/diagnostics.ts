import type { DevEnvironment, Rollup } from "vite";

/** In dev, the files that import `id`, as far as Vite's module graph knows them */
export function getDevImporters(environment: DevEnvironment): (id: string) => string[] {
  return (id) => [...(environment.moduleGraph.getModuleById(id)?.importers ?? [])].flatMap((importer) => importer.id ?? []);
}

/** In the build, once it has loaded every module: the files that import `id`, statically or dynamically */
export function getBuildImporters(context: Rollup.PluginContext): (id: string) => string[] {
  return (id) => {
    const { importers = [], dynamicImporters = [] } = context.getModuleInfo(id) ?? {};
    return [...importers, ...dynamicImporters];
  };
}

/** For the files from a file to the server component it imports: that server component, the files in between as
 * " through …", and the fix of removing its directive, which a package's file doesn't get */
export function describeServerComponentImport([, ...imported]: string[]): { serverComponent: string; through: string; removeDirective: string } {
  const serverComponent = imported.pop()!;
  return {
    serverComponent,
    through: imported.length > 0 ? ` through ${imported.join(", ")}` : "",
    // A package's file isn't the app's to change
    removeDirective: serverComponent.startsWith("node_modules/") ? "" : `, or remove "use server component" from ${serverComponent}, if nothing in it needs the server`,
  };
}
