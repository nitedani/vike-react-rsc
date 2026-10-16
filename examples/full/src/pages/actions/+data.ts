// Throws once after saveThenFailData()
export function data() {
  const failNext = (globalThis as { __failNext?: { data?: boolean } }).__failNext;
  if (!failNext?.data) return;
  failNext.data = false;
  throw new Error("data() failed on demand");
}
