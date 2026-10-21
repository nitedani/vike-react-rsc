// vike-react-rsc/useData in the rsc env, e.g. imported by a server component

export function useData(): never {
  throw new Error("[vike-react-rsc] useData() is for client components: read getPageContext().data in a server component");
}
