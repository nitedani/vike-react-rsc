// vike-react-rsc/client in the rsc env, e.g. in a server component

export function rsc(): never {
  throw new Error("[vike-react-rsc] Cannot use rsc in a server component. Render the server component directly.");
}
