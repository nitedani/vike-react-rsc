/** The value every copy of this package, e.g. a library's own, gets for `name`: the first copy to ask creates it */
export function getShared<T>(name: string, create: () => T): T {
  const shared = globalThis as { [key: symbol]: T | undefined };
  return (shared[Symbol.for(`vike-react-rsc:${name}`)] ??= create());
}
