import { tinyassert } from "@hiogawa/utils";
import type { RenderTarget, ResponseArtifactBody } from "vike/types";
import { environmentName } from "vike/runtime";
import { RSC_CONTENT_TYPE } from "../constants";
import runtimeRsc from "virtual:runtime/server";

tinyassert(environmentName === "ssr", "Invalid environment");

type RscRequestData =
  | { type: "navigation" }
  | { type: "action"; actionId: string; body: string | FormData };

export const rscRenderTarget: RenderTarget<
  RscRequestData,
  ResponseArtifactBody
> = {
  name: "react-flight",
  lifecycleRuntime: "ssr",
  renderRuntime: "rsc",
  match({ headers, isPrerendering }) {
    if (isPrerendering) return false;
    if (headers.has("x-rsc-action")) return true;
    return headers
      .get("accept")
      ?.split(",")
      .some((value) => value.trim().split(";", 1)[0] === "text/x-component") ?? false;
  },
  async prepareRequest({ headers, body }): Promise<RscRequestData> {
    const actionId = headers.get("x-rsc-action");
    if (!actionId) return { type: "navigation" };

    tinyassert(body, "Missing request body for RSC action");
    const contentType = headers.get("content-type");
    return {
      type: "action",
      actionId,
      body: contentType?.startsWith("multipart/form-data")
        ? await body.formData()
        : await body.text(),
    };
  },
  render(pageContext, pageConfigRef, requestData) {
    tinyassert(pageConfigRef.renderRuntime === "rsc", "Invalid render runtime");
    if (requestData.type === "action") {
      return runtimeRsc.handleServerAction({
        actionId: requestData.actionId,
        pageContext,
        body: requestData.body,
      });
    }
    return runtimeRsc.renderPageRsc(pageContext);
  },
  async encodeOutcome(outcome, responseIntent) {
    const createFlightResponse = (
      body: ResponseArtifactBody,
      statusCode: number
    ) => ({
      statusCode,
      headers: [],
      contentType: RSC_CONTENT_TYPE,
      body,
    });

    if (outcome.type === "rendered") {
      return createFlightResponse(outcome.value, responseIntent.statusCode);
    }

    if (outcome.type === "redirect") {
      const body = await runtimeRsc.renderRscPayload({
        redirect: { url: outcome.url, statusCode: outcome.statusCode },
      });
      // Responding 3xx would make fetch follow the Location and hand the HTML
      // document to the Flight decoder, so the redirect travels in the payload.
      return createFlightResponse(body, 200);
    }

    const body = await runtimeRsc.renderRscPayload({
      error: { reason: outcome.reason },
    });
    return createFlightResponse(body, responseIntent.statusCode);
  },
};
