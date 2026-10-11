// vike-react-rsc/server outside the rsc env, e.g. in a client component

/** Call it in a server action to also send the page, rendered after the action; otherwise only the return value is sent */
export function rerender(): void {
  throw new Error("Cannot use rerender in a client component. Call it in a server action.");
}

/** The headers of the server action's response, e.g. `getResponseHeaders().append("Set-Cookie", "session=...")` */
export function getResponseHeaders(): Headers {
  throw new Error("Cannot use getResponseHeaders in a client component. Call it in a server action.");
}
