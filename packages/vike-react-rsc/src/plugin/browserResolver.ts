import { createIdResolver, type Environment } from "vite";

let resolve: ((importPath: string, importer: string | undefined) => Promise<string | undefined>) | undefined;

/** The file the browser loads for an import, as the client env resolves it, with the browser's conditions */
export function resolveForBrowser(importPath: string, importer: string | undefined): Promise<string | undefined> {
  if (!resolve) throw new Error("[vike-react-rsc] The client env isn't known yet");
  return resolve(importPath, importer);
}

export function setBrowserEnvironment(environment: Environment): void {
  const resolveId = createIdResolver(environment.getTopLevelConfig());
  resolve = (importPath, importer) => resolveId(environment, importPath, importer);
}
