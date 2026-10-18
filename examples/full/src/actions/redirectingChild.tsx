"use server";

import { redirect } from "vike/abort";

// Redirects on the first render for each delay, as when a session is missing
const hasRedirected = new Set<number>();
async function RedirectOnce({ delay }: { delay: number }) {
  if (!hasRedirected.has(delay)) {
    hasRedirected.add(delay);
    throw redirect("/");
  }
  return <p data-rsc-redirecting-child="">Loaded</p>;
}

// Loaded with rsc(): not the server function but a server component it renders throws redirect()
export async function RedirectingChildComponent({ delay = 0 }: { delay?: number }) {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return <RedirectOnce delay={delay} />;
}
