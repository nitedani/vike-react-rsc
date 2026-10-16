import { render } from "vike/abort";

// Throws once after saveThenGuard404()
export function guard() {
  const failNext = (globalThis as { __failNext?: { guard?: boolean } }).__failNext;
  if (!failNext?.guard) return;
  failNext.guard = false;
  throw render(404);
}
