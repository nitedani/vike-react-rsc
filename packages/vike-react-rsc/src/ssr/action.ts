// Vike loads +middleware at startup, before Vite optimizes React, so neither this module nor its imports may import React
import { renderPage } from "vike/server";
import type { PageContextServer } from "vike/types";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER } from "../protocol";
import type { ActionOutcome } from "../types";
import { getRsc } from "./bridge";

/** One action request. The rsc env runs it with `id`, `body` and `responseHeaders`. */
export class ActionCall {
  readonly responseHeaders: Headers = new Headers();
  /** Set once the action returned */
  outcome?: ActionOutcome;
  #rsc?: ReturnType<typeof getRsc>;

  constructor(
    readonly id: string,
    readonly body: string | FormData
  ) {}

  // Vike creates a pageContext for every page it renders, and an error or a `throw render()` makes it render another
  // page for the same request: only the first one runs the action
  async run(pageContext: PageContextServer): Promise<void> {
    if (this.#rsc) return;
    this.#rsc = getRsc(pageContext);
    this.outcome = await this.#rsc.runtime.runAction(this.#rsc.pageContext, this);
  }

  /** The request's headers as the hooks after the action see them: with its cookies, e.g. a session for guard() */
  requestHeaders(headers: Record<string, string> | null): Record<string, string> | null {
    const actionCookies = this.responseHeaders.getSetCookie().map((setCookie) => setCookie.split(";", 1)[0]);
    if (!actionCookies.length) return headers;
    // name=value pairs: the action's replace the request's of the same name
    const pairs = [...(headers?.cookie?.split(";") ?? []), ...actionCookies].map((pair) => pair.trim()).filter(Boolean);
    const byName = new Map(pairs.map((pair) => [pair.split("=", 1)[0], pair]));
    return { ...headers, cookie: Array.from(byName.values()).join("; ") };
  }

  /** The answer for the page Vike rendered: the return value, and the page after rerender() */
  renderAnswer(pageContext: PageContextServer): ReadableStream<Uint8Array> {
    const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
    const { returnValue, rerender = false } = this.outcome ?? {};
    return runtime.renderAnswer(rscPageContext, { returnValue, rerender });
  }

  /** The answer without the page, e.g. when guard() or data() failed after the action */
  renderValueOnly(): ReadableStream<Uint8Array> {
    const { runtime, pageContext } = this.#rsc!;
    return runtime.renderAnswer(pageContext, { returnValue: this.outcome?.returnValue, rerender: false });
  }
}

// Vike's +middleware. renderPage() runs the action in onCreatePageContext, before guard() and data(), so they see what it changed
export async function actionMiddleware(request: Request): Promise<Response | undefined> {
  const id = request.headers.get(ACTION_HEADER);
  // renderPage() calls the middlewares again for the page it renders, with a GET
  if (!id || request.method !== "POST") return;
  if (isCrossSite(request)) return new Response(null, { status: 403 });

  // encodeReply() sends FormData when an argument holds a file or a form, else a string
  const body = request.headers.get("content-type")?.startsWith("multipart/") ? await request.formData() : await request.text();
  const call = new ActionCall(id, body);
  const { httpResponse } = await renderPage({ urlOriginal: request.url, headersOriginal: request.headers, rscAction: call });
  const { statusCode } = httpResponse;

  // Without rerender() the page isn't part of the answer, so neither is guard()'s or data()'s failure: the caller gets
  // what the action returned
  if (call.outcome && !call.outcome.rerender && statusCode !== 200) {
    return new Response(call.renderValueOnly(), {
      headers: new Headers([...call.responseHeaders, ["content-type", FLIGHT_CONTENT_TYPE]]),
    });
  }
  // The hooks' headers, then the action's
  const headers = new Headers([...httpResponse.headers, ...call.responseHeaders]);
  // A redirect thrown by the action, guard() or data(). fetch() would follow it and hand the new page's HTML to the
  // Flight decoder, so callServer() gets the target in a header and navigates.
  const location = headers.get("location");
  if (statusCode >= 300 && statusCode < 400 && location) {
    headers.delete("location");
    headers.set(REDIRECT_HEADER, location);
    return new Response(null, { headers });
  }
  return new Response(httpResponse.getReadableWebStream(), { status: statusCode, headers });
}

// Browsers already refuse a cross-site POST that carries ACTION_HEADER unless a CORS preflight allows it; this check
// doesn't depend on that
function isCrossSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  // Without either header, the request isn't from a browser
  return fetchSite ? fetchSite !== "same-origin" : !!origin && origin !== new URL(request.url).origin;
}
