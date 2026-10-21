"use server";

import { redirect } from "vike/abort";

async function Redirect(): Promise<never> {
  throw redirect("/");
}

// Loaded with rsc() on mount: a server component it renders throws redirect()
export async function AlwaysRedirectingChildComponent() {
  return <Redirect />;
}

// Loaded with rsc() on mount: callServer() follows the redirect it throws
export async function AlwaysRedirectingComponent(): Promise<never> {
  throw redirect("/");
}
