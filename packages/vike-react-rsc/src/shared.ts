/** The value every copy of this package, e.g. a library's own, gets for `name`: the first copy to ask creates it. The rsc
 * and ssr envs share it as they run in one process, which vite.ts requires on Cloudflare: scope, clientDeps and
 * forkPageContext rely on it */
export function getShared<T>(name: string, create: () => T): T {
  const shared = globalThis as { [key: symbol]: T | undefined };
  return (shared[Symbol.for(`vike-react-rsc:${name}`)] ??= create());
}
