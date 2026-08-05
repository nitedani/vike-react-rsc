import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { environmentName } from "vike/runtime";
import runtimeSsr from "virtual:runtime/ssr";
import { tinyassert } from "@hiogawa/utils";

tinyassert(environmentName === "ssr", "Invalid environment");

export const onRenderHtml: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  return runtimeSsr.onRenderHtmlSsr(pageContext);
};
