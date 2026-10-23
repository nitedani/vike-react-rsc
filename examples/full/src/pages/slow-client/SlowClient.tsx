"use client";
import { use } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";
import { increment } from "../../serverCounts";

// One wait per page render: React renders the component again once it's over
const waits = new WeakMap<object, Promise<void>>();

// A client component that waits for its own data, not for a server component's
export function SlowClient() {
  const pageContext = usePageContext();
  let wait = waits.get(pageContext);
  if (!wait) waits.set(pageContext, (wait = new Promise((resolve) => setTimeout(resolve, 1500))));
  use(wait);
  return <Resolved />;
}

// Rendered on the server only if the render still runs once the wait is over: not after the client left
function Resolved() {
  if (import.meta.env.SSR) increment("slow-client");
  return <p>Resolved</p>;
}
