import { createIdResolver, type Environment, type ResolvedConfig } from "vite";

let resolve: ((importPath: string, importer: string | undefined) => Promise<string | undefined>) | undefined;
let viteConfig: ResolvedConfig | undefined;

/** The file the browser loads for an import, as the client env resolves it, with the browser's conditions */
export function resolveForBrowser(importPath: string, importer: string | undefined): Promise<string | undefined> {
  if (!resolve) throw new Error("[vike-react-rsc] The client env isn't known yet");
  return resolve(importPath, importer);
}

/** The app's Vite config, which every env shares */
export function getViteConfig(): ResolvedConfig {
  if (!viteConfig) throw new Error("[vike-react-rsc] The client env isn't known yet");
  return viteConfig;
}

export function setBrowserEnvironment(environment: Environment): void {
  viteConfig = environment.getTopLevelConfig();
  const resolveId = createIdResolver(viteConfig);
  resolve = (importPath, importer) => resolveId(environment, importPath, importer);
}
