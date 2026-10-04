import environmentName from "virtual:environment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(environmentName === "rsc", "Invalid environment");

export { getPageElement };

import React, { Suspense } from "react";
import type { PageContext } from "vike/types";

async function getPageElement(
  pageContext: PageContext
): Promise<React.ReactElement> {
  // The rsc config values: Page, Layout, Wrapper and Loading.layout
  const { config } = pageContext;
  const { Page, Loading } = config;
  if (!Page) {
    // Rendering an empty fragment here produces a blank page that looks like a
    // styling bug rather than a missing Page config.
    throw new Error(
      `[vike-react-rsc] Page '${pageContext.pageId}' resolved no Page component.`
    );
  }
  let page: React.ReactElement = <Page />;

  // Wrapping
  const addSuspense = (el: React.ReactElement): React.ReactElement => {
    if (!Loading?.layout) return el;
    return <Suspense fallback={<Loading.layout />}>{el}</Suspense>;
  };
  page = addSuspense(page);
  [
    // Inner wrapping
    ...(config.Layout || []),
    // Outer wrapping
    ...(config.Wrapper || []),
  ].forEach((Wrap) => {
    page = <Wrap>{page}</Wrap>;
    page = addSuspense(page);
  });

  return page;
}
