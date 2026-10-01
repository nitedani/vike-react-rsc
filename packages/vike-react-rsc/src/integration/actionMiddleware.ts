import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { renderPage } from "vike/server";
import type { RscAction } from "../types";

// https://vike.dev/middleware
// A server action called from JavaScript: callServer() POSTs it to the URL of the page shown. renderPage() runs the action
// (+onCreatePageContext), then guard(), data() and the page, so they see what the action changed.
const serverActionMiddleware: UniversalMiddleware = enhance(
  async function vikeReactRscServerAction(request: Request) {
    const actionId = request.headers.get("x-rsc-action");
    if (request.method !== "POST" || !actionId) return;
    if (!isSameOrigin(request)) return new Response(null, { status: 403 });

    const rscAction: RscAction = { actionId, body: await readBody(request), responseHeaders: new Headers() };
    const { httpResponse } = await renderPage({ urlOriginal: request.url, headersOriginal: request.headers, rscAction });
    const headers = new Headers(httpResponse.headers);
    for (const [name, value] of rscAction.responseHeaders) headers.append(name, value);
    return new Response(httpResponse.getReadableWebStream(), { status: httpResponse.statusCode, headers });
  },
  { name: "vike-react-rsc:server-action" }
);
export default serverActionMiddleware;

// A cross-site page can make the browser POST with the user's cookies, but can't set these headers
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
