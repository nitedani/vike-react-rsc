import { Suspense } from "react";
import { redirect } from "vike/abort";

// As if the target came from user input, e.g. ?next=: the browser must not run it. Throws once the HTML has started.
async function Redirect(): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  throw redirect("javascript:void(window.__redirected=1)");
}

export default function Page() {
  return (
    <>
      <h1>Redirect to a javascript: URL</h1>
      <Suspense fallback={<p>Loading</p>}>
        <Redirect />
      </Suspense>
    </>
  );
}
