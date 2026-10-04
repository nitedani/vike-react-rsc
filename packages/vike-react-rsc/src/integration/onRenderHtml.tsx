import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { getRscEnvironment, onRenderHtmlSsr } from "../runtime/ssr";
import { RSC_CONTENT_TYPE } from "../constants";
import type { RscPayload } from "../types";

export const onRenderHtml: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  // A server action called from JavaScript (integration/actionMiddleware.ts): the page as Flight, or what replaced it
  if (pageContext.rscAction) {
    const rsc = getRscEnvironment(pageContext);
    // Without rerender(), rscPayload is the action's return value only, whatever guard() or data() threw
    const abortPayload = pageContext.rscAction.rerender ? getAbortPayload(pageContext) : undefined;
    pageContext.content = abortPayload ? await rsc.config.renderRsc(rsc.pageContext, abortPayload) : pageContext.rscPayload;
    pageContext.headersResponse.set("content-type", RSC_CONTENT_TYPE);
    return;
  }

  return onRenderHtmlSsr(pageContext);
};

function getAbortPayload(pageContext: PageContextServer): RscPayload | undefined {
  if (pageContext.is404) return { error: { reason: "not-found" } };
  if (pageContext.abortStatusCode || pageContext.errorWhileRendering)
    return { error: { reason: "error" } };
}
