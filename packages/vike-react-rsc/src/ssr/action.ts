// Vike loads +middleware at startup, before Vite optimizes React, so neither this module nor its imports may import React
import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { renderPage } from "vike/server";
import type { PageContextServer } from "vike/types";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, isActionRequest } from "../protocol";
import type { ActionOutcome } from "../types";
import { getRsc } from "./bridge";

/** One action request: the rsc env reads `id`, `body`, `responseHeaders` and `outcome` through its pageContext view */
export class ActionCall {
  readonly responseHeaders: Headers = new Headers();
  outcome?: ActionOutcome;
  #rsc?: ReturnType<typeof getRsc>;

  constructor(
    readonly id: string,
    readonly body: string | FormData
  ) {}

  // Vike calls onCreatePageContext again for the page a `throw render()` or an error shows instead
  async run(pageContext: PageContextServer): Promise<void> {
    if (this.#rsc) return;
    this.#rsc = getRsc(pageContext);
    this.outcome = await this.#rsc.runtime.runAction(this.#rsc.pageContext);
  }

  /** The hooks of this request see the cookies the action set, e.g. guard() after a login */
  withCookies(headers: Record<string, string> | null): Record<string, string> | null {
    const setCookies = this.responseHeaders.getSetCookie();
    if (setCookies.length === 0) return headers;
    const cookies = new Map<string, string>();
    for (const cookie of [...(headers?.cookie?.split(/;\s*/) ?? []), ...setCookies.map((c) => c.split(";")[0])]) {
      if (cookie) cookies.set(cookie.split("=")[0], cookie);
    }
    return { ...headers, cookie: [...cookies.values()].join("; ") };
  }

  renderValue(): Promise<ReadableStream<Uint8Array>> {
    return this.#rsc!.runtime.render(this.#rsc!.pageContext);
  }
}

// renderPage() runs the action in onCreatePageContext, before guard() and data(), so they see what it changed
export const actionMiddleware: UniversalMiddleware = enhance(
  async (request: Request) => {
    if (!isActionRequest(request)) return;
    if (!isSameOrigin(request)) return new Response(null, { status: 403 });

    const call = new ActionCall(request.headers.get(ACTION_HEADER)!, await readBody(request));
    // The inner request is a GET, so this middleware lets it through
    const { httpResponse } = await renderPage({ urlOriginal: request.url, headersOriginal: request.headers, rscAction: call });

    // Without rerender(), the return value is the answer, also when guard() or data() failed after the action
    if (call.outcome && !call.outcome.rerender && httpResponse.statusCode !== 200) {
      const headers = new Headers(call.responseHeaders);
      headers.set("content-type", FLIGHT_CONTENT_TYPE);
      return new Response(await call.renderValue(), { headers });
    }
    const headers = new Headers(httpResponse.headers);
    for (const [name, value] of call.responseHeaders) headers.append(name, value);
    // A throw redirect() in the action, guard() or data(): fetch() would follow a 3xx and hand HTML to the Flight decoder
    const location = headers.get("location");
    if (location && httpResponse.statusCode >= 300 && httpResponse.statusCode < 400) {
      headers.delete("location");
      headers.set(REDIRECT_HEADER, location);
      return new Response(null, { status: 200, headers });
    }
    return new Response(httpResponse.getReadableWebStream(), { status: httpResponse.statusCode, headers });
  },
  { name: "vike-react-rsc:server-action" }
);

// Defense in depth: browsers already preflight a cross-site request that carries the action header
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function readBody(request: Request): Promise<string | FormData> {
  return request.headers.get("content-type")?.startsWith("multipart/form-data") ? request.formData() : request.text();
}
