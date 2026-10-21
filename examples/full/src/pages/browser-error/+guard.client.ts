export function guard() {
  throw new Error("guard() failed in the browser on demand");
}
