"use client";

// It throws only in the browser, once the page's first render has ended: its Suspense boundary hydrates after the shell
export function ThrowsInBrowser() {
  if (typeof window !== "undefined") throw new Error("A component failed in the browser after its page rendered");
  return <p>Rendered on the server</p>;
}
