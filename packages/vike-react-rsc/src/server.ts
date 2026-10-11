// vike-react-rsc/server outside the rsc env, e.g. in a client component or a Vike hook such as data()

/** Call it in a server action to also send the page, rendered after the action; otherwise only the return value is sent */
export function rerender(): void {
  throw new Error("[vike-react-rsc] rerender() can only be called in a server action");
}

/** The headers of the server action's response, e.g. `getResponseHeaders().append("Set-Cookie", "session=...")` */
export function getResponseHeaders(): Headers {
  throw new Error("[vike-react-rsc] getResponseHeaders() can only be called in a server action");
}
