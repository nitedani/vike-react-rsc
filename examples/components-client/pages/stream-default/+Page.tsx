"use server component";
import { Suspense } from "react";

async function Delayed() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <p id="delayed">Rendered after a delay</p>;
}

// Has no +stream, so the HTML waits for Delayed
export default function Page() {
  return (
    <Suspense fallback={<p>Waiting for the delay</p>}>
      <Delayed />
    </Suspense>
  );
}
