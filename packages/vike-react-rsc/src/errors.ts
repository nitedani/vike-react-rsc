/** rerender() throws it outside a server action, in every environment */
export function notInServerAction(): Error {
  return new Error("[vike-react-rsc] rerender() needs a running server action, and none runs here");
}

/** getRequestContext() throws it outside a server component render or a server action, in every environment */
export function noRequestContext(): Error {
  return new Error("[vike-react-rsc] getRequestContext() needs a server component render or a server action, and neither runs here");
}
