/** rerender() throws it outside a server action, in every environment */
export function notInServerAction(): Error {
  return new Error("[vike-react-rsc] rerender() needs a running server action, and none runs here");
}
