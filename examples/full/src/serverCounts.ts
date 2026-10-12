// What the server rendered and ran, shown by /counts: the e2e reads it to tell one render, or one action run, from two
// On globalThis: the +middleware runs in the ssr environment, which has its own copy of this module
const counts: Record<string, number> = ((globalThis as { serverCounts?: Record<string, number> }).serverCounts ??= {});

export function increment(key: string): number {
  return (counts[key] = (counts[key] ?? 0) + 1);
}

export function getCounts(): Record<string, number> {
  return counts;
}
