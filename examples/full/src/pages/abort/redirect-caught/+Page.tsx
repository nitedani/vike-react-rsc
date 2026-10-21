import { Suspense } from "react";
import { redirect } from "vike/abort";
import { Boundary } from "./Boundary";

// Throws once the HTML has started
async function Redirect(): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  throw redirect("/");
}

export default function Page() {
  return (
    <>
      <h1>Redirect inside an error boundary</h1>
      <Boundary>
        <Suspense fallback={<p>Loading</p>}>
          <Redirect />
        </Suspense>
      </Boundary>
    </>
  );
}
