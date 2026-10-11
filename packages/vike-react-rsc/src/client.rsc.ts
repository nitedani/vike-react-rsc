// vike-react-rsc/client in the rsc env, e.g. imported by a server component

export function rsc(): never {
  throw new Error("[vike-react-rsc] rsc() is for client components: a server component renders the server component directly");
}
