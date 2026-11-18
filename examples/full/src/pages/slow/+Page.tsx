import { Suspense } from "react";
import { getPageContext } from "vike-react-rsc/pageContext";
import { increment, waitSlowly } from "../../serverCounts";

async function Slow() {
  await waitSlowly("slow", getPageContext());
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
