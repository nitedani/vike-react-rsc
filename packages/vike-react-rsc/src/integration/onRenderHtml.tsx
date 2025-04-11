import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import envName from "virtual:enviroment-name";
import runtimeSsr from "virtual:runtime/ssr";
import runtimeRsc from "virtual:runtime/server";

//@ts-ignore
export const onRenderHtml: OnRenderHtmlAsync =
  envName === "ssr" &&
  async function (pageContext: PageContextServer) {
    const rscPayloadStream = await runtimeRsc.renderPageRsc(pageContext);
    return runtimeSsr.onRenderHtmlSsr(pageContext, rscPayloadStream);
  };
