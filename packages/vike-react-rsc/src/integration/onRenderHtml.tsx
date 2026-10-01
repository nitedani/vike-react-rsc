import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { getRscConfig, onRenderHtmlSsr } from "../runtime/ssr";
import { tinyassert } from "@hiogawa/utils";
import { RSC_CONTENT_TYPE } from "../constants";
import type { RscPayload } from "../types";

type AbortRedirect = {
  _abortCaller?: "throw redirect()";
  _urlRedirect?: NonNullable<RscPayload["redirect"]>;
};

export const onRenderHtml: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  // A server action called from JavaScript (integration/actionMiddleware.ts): the page as Flight, or what replaced it
  if (pageContext.rscAction) {
    const abortPayload = getAbortPayload(pageContext);
    const flight = abortPayload
      ? await getRscConfig(pageContext).renderRsc(pageContext, abortPayload)
      : pageContext.rscPayload;
    pageContext.response = new Response(flight, { headers: { "content-type": RSC_CONTENT_TYPE } });
    return;
  }

  return onRenderHtmlSsr(pageContext);
};

function getAbortPayload(pageContext: PageContextServer): RscPayload | undefined {
  const abort = pageContext.dangerouslyUseInternals as unknown as AbortRedirect;
  if (abort._abortCaller === "throw redirect()") {
    tinyassert(abort._urlRedirect);
    // A 3xx would make fetch follow Location and hand HTML to the Flight decoder.
    return { redirect: abort._urlRedirect };
  }
  if (pageContext.is404) return { error: { reason: "not-found" } };
  if (pageContext.abortStatusCode || pageContext.errorWhileRendering)
    return { error: { reason: "error" } };
}
