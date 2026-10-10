// vike-react-rsc/server outside the rsc env, e.g. in a client component

export function rerender(): void {
  throw new Error("Cannot use rerender in a client component. Call it in a server action.");
}

export function getResponseHeaders(): Headers {
  throw new Error("Cannot use getResponseHeaders in a client component. Call it in a server action.");
}
