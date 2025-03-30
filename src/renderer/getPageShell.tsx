import React, { Suspense } from "react";

export function getPageShell(Page: React.ComponentType) {
  return (
    <div>
      <div>
        <a href="/">Go to Home</a>
        <a href="/about">Go to About</a>
      </div>
      <Suspense fallback={<div>Loading page...</div>}>
        <Page />
      </Suspense>
    </div>
  );
}
