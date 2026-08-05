import envName from "virtual:environment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "rsc", "Invalid environment");

export { getPageElementRsc };

import React, { Suspense } from "react";
import type { PageContext } from "vike/types";

type EnsureArray<T> = NonNullable<T> extends Array<any>
  ? NonNullable<T>
  : NonNullable<T>[];
type ConfigMap = {
  [K in keyof PageContext["config"]]: EnsureArray<PageContext["config"][K]>;
};

declare global {
  var __VIKE_RSC_PAGES_MANIFEST__: {
    [pageId: string]: {
      getConfig: () => Promise<ConfigMap>;
    };
  };
}

/**
 * Gets page configuration from either dev or production environment
 */
async function getPageConfig(pageContext: PageContext) {
  // Production: use manifest
  if (!import.meta.env.DEV) {
    return __VIKE_RSC_PAGES_MANIFEST__[pageContext.pageId!].getConfig();
  }

  // Development: process all config entries
  let result: ConfigMap = {};
  const entries = pageContext.configEntries || {};

  // Process each config entry type
  for (const [key, configEntries] of Object.entries(entries).filter(([key]) =>
    ["Page", "Layout", "Wrapper", "Loading"].includes(key)
  )) {
    if (!configEntries?.length) continue;

    // Load all components for this entry type
    const components = (
      await Promise.all(
        configEntries.map(async ({ configDefinedByFile }) => {
          // No defining file means the value was written inline in +config.js; it is
          // already on pageContext.config and there is nothing to import.
          if (!configDefinedByFile) return null;

          const filePath = configDefinedByFile.split("?")[0]!;
          if (!/[tj]sx?$/.test(filePath)) {
            throw new Error(
              `[vike-react-rsc] Page '${pageContext.pageId}' defines config '${key}' in ` +
                `'${configDefinedByFile}', which is not a module this renderer can import. ` +
                `Only .js/.jsx/.ts/.tsx are supported.`
            );
          }
          const module = await import(/* @vite-ignore */ filePath);
          const value = module[key] ?? module.default;
          if (value === undefined) {
            throw new Error(
              `[vike-react-rsc] Page '${pageContext.pageId}' defines config '${key}' in ` +
                `'${filePath}', but that file exports neither '${key}' nor a default.`
            );
          }
          return value;
        })
      )
    ).filter(Boolean);

    //@ts-ignore
    result[key] = components;
  }

  return result;
}
async function getPageElementRsc(
  pageContext: PageContext
): Promise<React.ReactElement> {
  let Layout: PageContext["config"]["Layout"] = [];
  let Wrapper: PageContext["config"]["Wrapper"] = [];
  let Loading: PageContext["config"]["Loading"] = {};

  if (!pageContext.pageId && !import.meta.env.DEV) {
    throw new Error("Missing pageId in production environment");
  }

  const config = await getPageConfig(pageContext);
  const Page = config.Page?.[0];
  if (!Page) {
    // Rendering an empty fragment here produces a blank page that looks like a
    // styling bug rather than a missing Page config.
    throw new Error(
      `[vike-react-rsc] Page '${pageContext.pageId}' resolved no Page component.`
    );
  }
  Layout = config.Layout ?? Layout;
  Wrapper = config.Wrapper ?? Wrapper;
  Loading = config.Loading?.[0] ?? Loading;

  let page = Page ? <Page /> : null;
  // Wrapping
  const addSuspense = (el: React.ReactElement | null) => {
    if (!Loading?.layout) return el;
    return <Suspense fallback={<Loading.layout />}>{page}</Suspense>;
  };
  page = addSuspense(page);
  [
    // Inner wrapping
    ...(Layout || []),
    // Outer wrapping
    ...(Wrapper || []),
  ].forEach((Wrap) => {
    page = <Wrap>{page}</Wrap>;
    page = addSuspense(page);
  });

  return page!;
}
