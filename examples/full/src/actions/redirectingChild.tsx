"use server";

import { redirect } from "vike/abort";

// Redirects on its first render, as when a session is missing
let hasRedirected = false;
async function RedirectOnce() {
  if (!hasRedirected) {
    hasRedirected = true;
    throw redirect("/");
  }
  return <p data-rsc-redirecting-child="">Loaded</p>;
}

// Loaded with rsc(): not the server function but a server component it renders throws redirect()
export async function RedirectingChildComponent() {
  return <RedirectOnce />;
}
