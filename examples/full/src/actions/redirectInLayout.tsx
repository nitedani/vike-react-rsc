"use server";

import { redirect } from "vike/abort";
import { getRequestContext } from "vike-react-rsc/server";

const target = "/abort/redirect-in-layout/target";

async function Redirect(): Promise<never> {
  throw redirect(target);
}

// Loaded with rsc() in the layout that both /abort/redirect-in-layout pages share: on the first one, a server component
// it renders redirects to the second one, or with ?in=server-function it does
export async function LayoutComponent() {
  const url = new URL(String(getRequestContext().urlOriginal), "http://localhost");
  if (url.pathname === target) return "Loaded on the target";
  if (url.searchParams.get("in") === "server-function") throw redirect(target);
  return <Redirect />;
}
