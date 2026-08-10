import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { environmentName } from "vike/runtime";
import runtimeSsr from "virtual:runtime/ssr";
import runtimeRsc from "virtual:runtime/server";
import { tinyassert } from "@hiogawa/utils";
import { RSC_CONTENT_TYPE } from "../constants";
import type { RscPayload } from "../types";

tinyassert(environmentName === "ssr", "Invalid environment");

const RSC_MEDIA_TYPE = RSC_CONTENT_TYPE.split(";", 1)[0];

type AbortRedirect = {
  _abortCaller?: "throw redirect()";
  _urlRedirect?: NonNullable<RscPayload["redirect"]>;
};

export const onRenderHtml: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  const { request } = pageContext;
  if (request && isFlightRequest(request)) {
    pageContext.response = new Response(await renderFlight(pageContext, request), {
      headers: { "content-type": RSC_CONTENT_TYPE },
    });
    return;
  }

  return runtimeSsr.onRenderHtmlSsr(pageContext);
};

function isFlightRequest(request: Request): boolean {
  const accept = request.headers.get("accept");
  return (
    request.headers.has("x-rsc-action") ||
    (accept
      ?.split(",")
      .some((value) => value.trim().split(";", 1)[0] === RSC_MEDIA_TYPE) ??
      false)
  );
}

async function renderFlight(
  pageContext: PageContextServer,
  request: Request
): Promise<ReadableStream<Uint8Array>> {
  const abortPayload = getAbortPayload(pageContext);
  if (abortPayload) return runtimeRsc.renderRscPayload(abortPayload);

  const actionId = request.headers.get("x-rsc-action");
  return actionId
    ? runtimeRsc.handleServerAction({
        actionId,
        pageContext,
        body: await readActionBody(request),
      })
    : runtimeRsc.renderPageRsc(pageContext);
}

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

async function readActionBody(request: Request): Promise<string | FormData> {
  return request.headers.get("content-type")?.startsWith("multipart/form-data")
    ? request.formData()
    : request.text();
}
