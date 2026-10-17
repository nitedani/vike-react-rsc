import { Suspense } from "react";
import { redirect } from "vike/abort";

// Throws once the HTML has started
async function Redirect(): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  throw redirect("/");
}

export default function Page() {
  return (
    <>
      <h1>Redirect, streamed</h1>
      <Suspense fallback={<p>Loading</p>}>
        <Redirect />
      </Suspense>
    </>
  );
}
