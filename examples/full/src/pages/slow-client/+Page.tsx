import { Suspense } from "react";
import { SlowClient } from "./SlowClient";

export default function Page() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <SlowClient />
    </Suspense>
  );
}
