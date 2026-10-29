import { setTimeout } from "node:timers/promises";
import { Suspense } from "react";
import { getPageContext } from "vike-react-rsc/pageContext";
import { increment } from "../../serverCounts";

async function Slow() {
  await setTimeout(1500, undefined, { signal: getPageContext().abortSignal });
  // Counted only if the wait ran to its end: not after the client left
  increment("slow-signal");
  return <p>Resolved</p>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Slow />
    </Suspense>
  );
}
