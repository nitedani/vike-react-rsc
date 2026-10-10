import { Suspense } from "react";
import { increment } from "../../serverCounts";

async function Slow() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return <Resolved />;
}

// Rendered only if the render still runs once Slow resolves: not after the client left
function Resolved() {
  increment("slow");
  return <p data-slow="">Resolved</p>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Slow />
    </Suspense>
  );
}
