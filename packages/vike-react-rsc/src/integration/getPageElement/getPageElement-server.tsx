import envName from "virtual:enviroment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "ssr", "Invalid environment");

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
      importPage: () => Promise<PageContext["Page"]>;
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
        configEntries.map(async ({ configDefinedAt }) => {
          // Hacky hacky
          const filePath = configDefinedAt.split(" at ").pop() || "";
          if (!/[tj]sx?$/.test(filePath) || !(key in pageContext.config)) {
            return null;
          }
          const module = await import(/* @vite-ignore */ filePath);
          return module[key] || module.default;
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
  let Page: PageContext["Page"] = () => <></>;
  let Layout: PageContext["config"]["Layout"] = [];
  let Wrapper: PageContext["config"]["Wrapper"] = [];
  let Loading: PageContext["config"]["Loading"] = {};

  if (!pageContext.pageId && !import.meta.env.DEV) {
    throw new Error("Missing pageId in production environment");
  }

  // const config = await getPageConfig(pageContext);
  Page = pageContext.Page
  Layout = pageContext.config.Layout ?? Layout;
  Wrapper = pageContext.config.Wrapper ?? Wrapper;
  Loading = pageContext.config.Loading ?? Loading;

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
