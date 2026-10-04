import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { renderPage } from "vike/server";
import type { RscAction } from "../types";
import { RSC_REDIRECT_HEADER } from "../constants";

// https://vike.dev/middleware
// A server action called from JavaScript: callServer() POSTs it to the URL of the page shown. renderPage() runs the action
// (+onCreatePageContext), then guard(), data() and the page, so they see what the action changed.
const serverActionMiddleware: UniversalMiddleware = enhance(
  async (request: Request) => {
    const actionId = request.headers.get("x-rsc-action");
    if (request.method !== "POST" || !actionId) return;
    if (!isSameOrigin(request)) return new Response(null, { status: 403 });

    const rscAction: RscAction = { actionId, body: await readBody(request), responseHeaders: new Headers() };
    // Its own request is a GET, so renderPage() doesn't run this middleware again
    const { httpResponse } = await renderPage({ urlOriginal: request.url, headersOriginal: request.headers, rscAction });
    const headers = new Headers(httpResponse.headers);
    for (const [name, value] of rscAction.responseHeaders) headers.append(name, value);
    // A throw redirect() in the action, guard() or data(): fetch would follow a 3xx and hand HTML to the Flight decoder
    const location = headers.get("location");
    if (location && httpResponse.statusCode >= 300 && httpResponse.statusCode < 400) {
      headers.delete("location");
      headers.set(RSC_REDIRECT_HEADER, location);
      return new Response(null, { status: 200, headers });
    }
    return new Response(httpResponse.getReadableWebStream(), { status: httpResponse.statusCode, headers });
  },
  { name: "vike-react-rsc:server-action" }
);
export default serverActionMiddleware;

// Defense in depth: browsers already preflight the x-rsc-action header; forms without JavaScript will need this check
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function readBody(request: Request): Promise<string | FormData> {
  return request.headers.get("content-type")?.startsWith("multipart/form-data")
    ? request.formData()
    : request.text();
}
