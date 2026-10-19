// vike-react-rsc/ClientOnly in the rsc env, e.g. imported by a server component

export function ClientOnly(): never {
  throw new Error('[vike-react-rsc] <ClientOnly> is for client components: render it in a "use client" file, so its children never load on the server');
}
