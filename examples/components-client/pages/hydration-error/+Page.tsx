// It throws only in the browser, so its hydration fails
export default function Page() {
  if (typeof window !== "undefined") throw new Error("A page failed to hydrate on demand");
  return <h1>A page whose hydration throws</h1>;
}
