import { Suspense } from "react";
import { redirect } from "vike/abort";
import { getPageContext } from "vike-react-rsc/pageContext";

// To ?next=, which comes from user input: the browser must not follow it unless it's an http(s) URL. Throws once the
// HTML has started.
async function Redirect(): Promise<never> {
  const { next } = getPageContext().urlParsed.search;
  await new Promise((resolve) => setTimeout(resolve, 300));
  throw redirect(next!);
}

export default function Page() {
  return (
    <>
      <h1>Redirect to ?next=</h1>
      <Suspense fallback={<p>Loading</p>}>
        <Redirect />
      </Suspense>
    </>
  );
}
