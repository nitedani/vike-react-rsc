// Vike loads +middleware at startup, before Vite optimizes React, so neither this module nor its imports may import React
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

// Vike's +middleware. It hands the action to the page Vike renders after every middleware: onCreatePageContext runs it
// there, before guard() and data(), so they see what it changed, and the action sees the context of every middleware.
export async function actionMiddleware(
  request: Request,
  context: object
): Promise<Response | ((response: Response) => Response) | undefined> {
  const id = request.headers.get(ACTION_HEADER);
  if (!id || request.method !== "POST") return;
  if (isCrossSite(request)) return new Response(null, { status: 403 });

  // encodeReply() sends FormData when an argument holds a file or a form, else a string
  const body = request.headers.get("content-type")?.startsWith("multipart/") ? await request.formData() : await request.text();
  const call = new ActionCall(id, body);
  // A middleware returns either context or a response function: the context is the object Vike merges into the page's
  // pageContext, so it gets the action directly
  Object.assign(context, { rscAction: call });
  return (response: Response) => toAnswer(call, response);
}

// The answer to the action, from the response of the page Vike rendered
function toAnswer(call: ActionCall, response: Response): Response {
  const { status } = response;
  // Without rerender() the page isn't part of the answer, so neither is guard()'s or data()'s failure: the caller gets
  // what the action returned
  if (call.outcome && !call.outcome.rerender && status !== 200) {
    void response.body?.cancel();
    return new Response(call.renderValueOnly(), {
      headers: new Headers([...call.responseHeaders, ["content-type", FLIGHT_CONTENT_TYPE]]),
    });
  }
  // The hooks' headers, then the action's
  const headers = new Headers([...response.headers, ...call.responseHeaders]);
  // A redirect thrown by the action, guard() or data(). fetch() would follow it and hand the new page's HTML to the
  // Flight decoder, so callServer() gets the target in a header and navigates.
  const location = headers.get("location");
  if (status >= 300 && status < 400 && location) {
    void response.body?.cancel();
    headers.delete("location");
    headers.set(REDIRECT_HEADER, location);
    return new Response(null, { headers });
  }
  return new Response(response.body, { status, headers });
}

// Browsers already refuse a cross-site POST that carries ACTION_HEADER unless a CORS preflight allows it; this check
// doesn't depend on that
function isCrossSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  // Without either header, the request isn't from a browser
  return fetchSite ? fetchSite !== "same-origin" : !!origin && origin !== new URL(request.url).origin;
}
