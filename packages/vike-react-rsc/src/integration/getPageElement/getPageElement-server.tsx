import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "rsc", "Invalid environment");

export { getPageElementRsc };

import React from "react";
import type { PageContext } from "vike/types";
import { getPageElement } from "./getPageElement.js";

declare global {
  var __VIKE_RSC_PAGES_MANIFEST__: {
    [pageId: string]: { importPage: () => Promise<PageContext["Page"]> };
  };
}
function importPageById(pageId: string): Promise<PageContext["Page"]> {
  const assetsManifest = __VIKE_RSC_PAGES_MANIFEST__;
  return assetsManifest[pageId].importPage();
}

async function getPageElementRsc(
  pageContext: PageContext
): Promise<React.ReactElement> {
  const Page = await importPageById(pageContext.pageId!);
  pageContext.Page = Page;
  const page = getPageElement(pageContext);
  return page!;
}
