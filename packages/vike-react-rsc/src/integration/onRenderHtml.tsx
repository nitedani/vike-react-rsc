import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import envName from "virtual:enviroment-name";
import runtimeSsr from "virtual:runtime/ssr";

//@ts-ignore
export const onRenderHtml: OnRenderHtmlAsync =
  envName === "ssr" &&
  async function (pageContext: PageContextServer) {
    return runtimeSsr.onRenderHtmlSsr(pageContext);
  };
