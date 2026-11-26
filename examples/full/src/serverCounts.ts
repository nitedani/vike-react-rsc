import type { PageContext } from "vike/types";

// What the server rendered and ran, shown by /counts: the e2e reads it to tell one render, or one action run, from two
// On globalThis: the +middleware runs in the ssr environment, which has its own copy of this module
const counts: Record<string, number> = ((globalThis as { serverCounts?: Record<string, number> }).serverCounts ??= {});

export function increment(key: string): number {
  return (counts[key] = (counts[key] ?? 0) + 1);
}

export function getCounts(): Record<string, number> {
  return counts;
}

// The waits of requests with ?held, which /counts?release ends
const heldWaits = ((globalThis as { heldWaits?: Set<() => void> }).heldWaits ??= new Set());

// A slow page's 1.5 s wait, or with ?held until /counts?release or 30 s, counted as "<key> started" and "<key> left"
export function waitSlowly(key: string, pageContext: PageContext, endsOnLeave?: boolean): Promise<void> {
  const { abortSignal, urlParsed } = pageContext;
  const isHeld = "held" in urlParsed.search;
  increment(`${key} started`);
  return new Promise((resolve, reject) => {
    // Ends the wait once, and leaves no timer, listener or held entry behind
    const settle = (leftWith?: { reason: unknown }) => {
      clearTimeout(timer);
      heldWaits.delete(end);
      abortSignal.removeEventListener("abort", onLeave);
      if (leftWith) reject(leftWith.reason);
      else resolve();
    };
    const end = () => settle();
    const onLeave = () => {
      increment(`${key} left`);
      if (endsOnLeave) settle({ reason: abortSignal.reason });
    };
    const timer = setTimeout(end, isHeld ? 30_000 : 1500);
    if (isHeld) heldWaits.add(end);
    abortSignal.addEventListener("abort", onLeave, { once: true });
  });
}

export function releaseHeldWaits() {
  for (const release of heldWaits) release();
  heldWaits.clear();
}
