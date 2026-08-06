import { tinyassert } from "@hiogawa/utils";
import { environmentName } from "vike/runtime";
import type { OnRenderResponseReturn, PageContextServer } from "vike/types";
import { RSC_CONTENT_TYPE } from "../constants";
import type { RscPayload } from "../types";
import runtimeRsc from "virtual:runtime/server";

tinyassert(environmentName === "ssr", "Invalid environment");

const RSC_MEDIA_TYPE = RSC_CONTENT_TYPE.split(";", 1)[0];
type AbortFlight = { payload: RscPayload; status: number };

export async function onRenderResponse(
  pageContext: PageContextServer
): Promise<OnRenderResponseReturn> {
  const { request } = pageContext;
  if (!request || !isFlightRequest(request)) return;

  const { body, status } = await renderFlight(pageContext, request);
  return new Response(body, {
    headers: { "Content-Type": RSC_CONTENT_TYPE },
    status,
  });
}

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
): Promise<{ body: ReadableStream<Uint8Array>; status: number }> {
  const abortFlight = getAbortFlight(pageContext);
  if (abortFlight) {
    const { payload, status } = abortFlight;
    return { body: runtimeRsc.renderRscPayload(payload), status };
  }

  const actionId = request.headers.get("x-rsc-action");
  const body = actionId
    ? await runtimeRsc.handleServerAction({
        actionId,
        pageContext,
        body: await readActionBody(request),
      })
    : await runtimeRsc.renderPageRsc(pageContext);
  return { body, status: 200 };
}

function getAbortFlight(
  pageContext: PageContextServer
): AbortFlight | undefined {
  if (pageContext.abortRedirect) {
    return {
      payload: { redirect: pageContext.abortRedirect },
      // A 3xx would make fetch follow Location and hand HTML to the Flight decoder.
      status: 200,
    };
  }
  if (pageContext.is404)
    return { payload: { error: { reason: "not-found" } }, status: 404 };

  const status = pageContext.abortStatusCode ??
    (pageContext.errorWhileRendering ? 500 : undefined);
  if (status === undefined) return;
  return { payload: { error: { reason: "error" } }, status };
}

async function readActionBody(request: Request): Promise<string | FormData> {
  return request.headers.get("content-type")?.startsWith("multipart/form-data")
    ? request.formData()
    : request.text();
}
