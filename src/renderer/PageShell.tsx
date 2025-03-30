import { Suspense } from "react";

export function PageShell(Page: React.ComponentType) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page />
    </Suspense>
  );
}
