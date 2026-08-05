export function getGlobalObject<T extends Record<string, unknown> = never>(
  // We use the filename as key; each `getGlobalObject()` call should live inside a file with a unique filename.
  key: `${string}.ts`,
  defaultValue: T,
): T {
  const globalWithRscObjects = globalThis as typeof globalThis & {
    [projectKey]?: Record<string, Record<string, unknown>>;
  };
  const globalObjectsAll = (globalWithRscObjects[projectKey] ??= {});
  const globalObject = (globalObjectsAll[key] ??= defaultValue);
  return globalObject as T;
}
const projectKey = "_vike_react_rsc";
