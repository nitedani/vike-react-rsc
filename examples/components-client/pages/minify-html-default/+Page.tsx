"use server component";
import { Suspense } from "react";

async function Minified() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <p id="minified">{"Several    spaces"}</p>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Waiting for the delay</p>}>
      <Minified />
    </Suspense>
  );
}
