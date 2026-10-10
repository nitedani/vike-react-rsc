// What the server rendered and ran, shown by /counts: the e2e reads it to tell one render, or one action run, from two
const counts: Record<string, number> = {};

export function increment(key: string): number {
  return (counts[key] = (counts[key] ?? 0) + 1);
}

export function getCounts(): Record<string, number> {
  return counts;
}
