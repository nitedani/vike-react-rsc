export { getPageElement };

import React, { Suspense } from "react";
import type { PageContext } from "vike/types";

function getPageElement(pageContext: PageContext): React.ReactElement | null {
  const {
    Page,
    config: { Loading },
  } = pageContext;
  let page = Page ? <Page /> : null;

  // Wrapping
  const addSuspense = (el: React.ReactElement | null) => {
    if (!Loading?.layout) return el;
    return <Suspense fallback={<Loading.layout />}>{page}</Suspense>;
  };
  page = addSuspense(page);
  [
    // Inner wrapping
    ...(pageContext.config.Layout || []),
    // Outer wrapping
    ...(pageContext.config.Wrapper || []),
  ].forEach((Wrap) => {
    page = <Wrap>{page}</Wrap>;
    page = addSuspense(page);
  });

  return page;
}
