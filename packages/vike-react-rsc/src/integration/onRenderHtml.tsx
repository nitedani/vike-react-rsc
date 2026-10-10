import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { onRenderHtmlSsr } from "../runtime/ssr";
import { getRsc } from "../ssr/bridge";
import { FLIGHT_CONTENT_TYPE } from "../protocol";
import type { ErrorReason } from "../types";

export const onRenderHtml: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  // A server action called from JavaScript (integration/actionMiddleware.ts): the page as Flight, or what replaced it
  if (pageContext.rscAction) {
    // Without rerender(), rscPayload is the return value only (the middleware answers with it if Vike's answer isn't a 200)
    const errorReason = getErrorReason(pageContext);
    pageContext.content = errorReason ? getRsc(pageContext).runtime.renderError(errorReason) : pageContext.rscPayload;
    pageContext.headersResponse.set("content-type", FLIGHT_CONTENT_TYPE);
    return;
  }

  return onRenderHtmlSsr(pageContext);
};

function getErrorReason(pageContext: PageContextServer): ErrorReason | undefined {
  if (pageContext.is404) return "not-found";
  if (pageContext.abortStatusCode || pageContext.errorWhileRendering) return "error";
}
