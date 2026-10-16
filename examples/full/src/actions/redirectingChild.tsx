"use server";

import { redirect } from "vike/abort";

async function Redirect(): Promise<never> {
  throw redirect("/");
}

// Loaded with rsc(): not the server function but a server component it renders throws redirect()
export async function RedirectingChildComponent() {
  return <Redirect />;
}
