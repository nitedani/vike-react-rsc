import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { environmentName } from "vike/runtime";
import runtimeSsr from "virtual:runtime/ssr";
import runtimeRsc from "virtual:runtime/server";
import { tinyassert } from "@hiogawa/utils";
import { RSC_CONTENT_TYPE } from "../constants";
import type { RscPayload } from "../types";

tinyassert(environmentName === "server", "Invalid environment");

type AbortRedirect = {
  _abortCaller?: "throw redirect()";
  _urlRedirect?: NonNullable<RscPayload["redirect"]>;
};

export const onRenderHtml: OnRenderHtmlAsync = async function (
  pageContext: PageContextServer
) {
  const { request } = pageContext;
  const actionId = request?.headers.get("x-rsc-action");
  if (actionId) {
    pageContext.response = new Response(await renderAction(pageContext, request!, actionId), {
      headers: { "content-type": RSC_CONTENT_TYPE },
    });
    return;
  }

  return runtimeSsr.onRenderHtmlSsr(pageContext);
};

async function renderAction(
  pageContext: PageContextServer,
  request: Request,
  actionId: string
): Promise<ReadableStream<Uint8Array>> {
  const abortPayload = getAbortPayload(pageContext);
  if (abortPayload) return runtimeRsc.renderRscPayload(abortPayload);

  return runtimeRsc.handleServerAction({
    actionId,
    pageContext,
    body: await readActionBody(request),
  });
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
