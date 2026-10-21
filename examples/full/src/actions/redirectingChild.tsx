"use server";

import { redirect } from "vike/abort";

type Props = { first: "child" | "server-function"; delay?: number };

// Redirects on the first render of each panel, as when a session is missing
const hasRedirected = new Set<string>();
function redirectOnce(props: Props): void {
  const panel = JSON.stringify(props);
  if (hasRedirected.has(panel)) return;
  hasRedirected.add(panel);
  throw redirect("/");
}

async function RedirectOnce(props: Props) {
  redirectOnce(props);
  return <p data-rsc-redirecting-child="">Loaded</p>;
}

// Loaded with rsc(): a server component it renders throws redirect(), or with `first: "server-function"` the server
// function of the panel without delay does
export async function RedirectingChildComponent(props: Props) {
  await new Promise((resolve) => setTimeout(resolve, props.delay ?? 0));
  if (props.first === "server-function" && !props.delay) redirectOnce(props);
  return <RedirectOnce {...props} />;
}
