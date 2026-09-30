import { environmentName, loadPageConfig } from "vike/runtime";
import { tinyassert } from "@hiogawa/utils";
tinyassert(environmentName === "rsc", "Invalid environment");

export { getPageElementRsc };

import React, { Suspense } from "react";
import type { PageContext } from "vike/types";

async function getPageElementRsc(
  pageContext: PageContext
): Promise<React.ReactElement> {
  tinyassert(pageContext.pageId, "Missing pageId");
  const { config } = await loadPageConfig(pageContext.pageId);
  const Page = config.Page;
  if (!Page) {
    // Rendering an empty fragment here produces a blank page that looks like a
    // styling bug rather than a missing Page config.
    throw new Error(
      `[vike-react-rsc] Page '${pageContext.pageId}' resolved no Page component.`
    );
  }
  const Layout = config.Layout ?? [];
  const Wrapper = config.Wrapper ?? [];
  const Loading = config.Loading ?? {};

  let page: React.ReactElement = <Page />;
  const addSuspense = (el: React.ReactElement): React.ReactElement => {
    if (!Loading.layout) return el;
    return <Suspense fallback={<Loading.layout />}>{el}</Suspense>;
  };
  page = addSuspense(page);
  [...Layout, ...Wrapper].forEach((Wrap) => {
    page = <Wrap>{page}</Wrap>;
    page = addSuspense(page);
  });

  return page;
}
