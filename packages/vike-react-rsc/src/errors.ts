/** rerender() and getResponseHeaders() throw it outside a server action, in every environment */
export function notInServerAction(name: string): Error {
  return new Error(`[vike-react-rsc] ${name}() needs a running server action, and none runs here`);
}
