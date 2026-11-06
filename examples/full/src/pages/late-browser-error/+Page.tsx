import { Suspense } from "react";
import { ThrowsInBrowser } from "./ThrowsInBrowser";

export default function Page() {
  return (
    <>
      <h1>A page whose component throws in the browser</h1>
      <Suspense fallback={<p>Loading</p>}>
        <ThrowsInBrowser />
      </Suspense>
    </>
  );
}
