import { Suspense } from "react";
import CspClient from "./CspClient";

// Streams a Suspense boundary, so React writes inline scripts of its own too.
async function Delayed() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <p data-delayed>Streamed</p>;
}

export default function Page() {
  return (
    <>
      <CspClient />
      <Suspense fallback={<p>Loading</p>}>
        <Delayed />
      </Suspense>
    </>
  );
}
