// Vike loads +middleware at startup, before Vite optimizes React, so neither this module nor its imports may import React
import { getGlobalContext } from "vike/server";
import type { PageContextServer } from "vike/types";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, UNKNOWN_ACTION_HEADER } from "../protocol";
import type { ActionOutcome } from "../types";
import { getRsc } from "./bridge";

/** One action request. The rsc env runs it with `id` and `body`; without `id`, `body` is a form submitted before
 * hydration. */
export class ActionCall {
  /** The Set-Cookie lines the action appended to pageContext.headersResponse */
  #setCookies: string[] = [];
  /** Set once the action returned */
  outcome?: ActionOutcome;
  #rsc?: ReturnType<typeof getRsc>;

  constructor(
    readonly id: string | undefined,
    readonly body: string | FormData,
    readonly url: string
  ) {}

  // Vike creates a pageContext for every page it renders, and an error or a `throw render()` makes it render another
  // page for the same request: only the first one runs the action
  async run(pageContext: PageContextServer): Promise<void> {
    if (this.#rsc) return;
    this.#rsc = getRsc(pageContext);
    const before = pageContext.headersResponse.getSetCookie().length;
    try {
      this.outcome = await this.#rsc.runtime.runAction(this.#rsc.pageContext, this);
    } finally {
      this.#setCookies = pageContext.headersResponse.getSetCookie().slice(before);
    }
  }

  /** A form submitted before hydration: the answer is the page's HTML */
  get isForm(): boolean {
    return this.id === undefined;
  }

  /** The answer for the page Vike rendered: the return value, and the page after rerender() */
  renderAnswer(pageContext: PageContextServer): ReadableStream<Uint8Array> {
    const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
    // No outcome: the action threw. After render() to a page, the answer is that page, as for a form; Vike's error
    // page (is404 set) is left out, as callServer() rejects on its status without reading it
    const { returnValue, rerender } = this.outcome ?? { returnValue: undefined, rerender: pageContext.is404 === null };
    return runtime.actionPayload(rscPageContext, { returnValue, rerender });
  }

  /** The answer to the action, from the response of the page Vike rendered */
  answer(response: Response): Response {
    const { status } = response;
    if (this.outcome?.isUnknownAction) {
      void response.body?.cancel();
      // A form can't reload as callServer() does, so the browser gets the page again, from this build
      if (this.isForm) {
        const { pathname, search } = new URL(this.url);
        return new Response(null, { status: 303, headers: { location: pathname + search } });
      }
      return new Response(null, { status: 404, headers: { [UNKNOWN_ACTION_HEADER]: "1" } });
    }
    // The hooks' headers, then the action's
    const headers = new Headers(response.headers);
    // Vike sends them, except on the error page it renders after an error
    const sent = headers.getSetCookie();
    for (const setCookie of this.#setCookies) if (!sent.includes(setCookie)) headers.append("set-cookie", setCookie);
    // The page, or a redirect a browser follows
    if (this.isForm) return new Response(response.body, { status, headers });

    // Without rerender() the page isn't part of the answer, so neither is guard()'s or data()'s failure: the caller
    // gets what the action returned
    if (this.outcome && !this.outcome.rerender && status !== 200) {
      void response.body?.cancel();
      const { runtime, pageContext } = this.#rsc!;
      const body = runtime.actionPayload(pageContext, { returnValue: this.outcome.returnValue, rerender: false });
      return new Response(body, {
        headers: new Headers([...this.#setCookies.map((setCookie): [string, string] => ["set-cookie", setCookie]), ["content-type", FLIGHT_CONTENT_TYPE]]),
      });
    }
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
}

// Vike's +middleware. It hands the action to the page Vike renders after every middleware: onCreatePageContext runs it
// there, before guard() and data(), so they see what it changed, and the action sees the context of every middleware.
export async function actionMiddleware(
  request: Request,
  context: object
): Promise<Response | ((response: Response) => Response) | undefined> {
  if (request.method !== "POST") return;
  const id = request.headers.get(ACTION_HEADER) ?? undefined;
  const limit = (await getGlobalContext()).config.rsc?.bodySizeLimit ?? 1024 * 1024;
  const form = id ? undefined : await getActionForm(request, limit);
  if (form === null) return;
  if (isCrossSite(request)) return new Response(null, { status: 403 });

  const body = id ? await readBody(request, limit) : form;
  if (body === undefined) return new Response(null, { status: 413 });
  const call = new ActionCall(id, body, request.url);
  // A middleware returns either context or a response function: the context is the object Vike merges into the page's
  // pageContext, so it gets the action directly
  Object.assign(context, { rscAction: call });
  return (response: Response) => call.answer(response);
}

// React renders a form whose action is a server function as a multipart POST with $ACTION_ fields, for a submit
// before hydration, which the browser sends as a navigation. Read from a copy, so the POST reaches the next handler
// with its body, and only a navigation: reading part of a fetch() upload breaks the client's next request on that
// connection when the route answers without reading the rest. Null when the request isn't such a form, undefined
// when it's one with more than `limit` bytes.
async function getActionForm(request: Request, limit: number): Promise<FormData | undefined | null> {
  if (request.headers.get("sec-fetch-mode") !== "navigate") return null;
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data")) return null;
  const form = await readBody(request.clone(), limit).catch(() => null);
  if (form === undefined) return (await startsWithActionField(request.clone(), contentType)) ? undefined : null;
  return form instanceof FormData && [...form.keys()].some((key) => /^\$ACTION_(ID|REF)_/.test(key)) ? form : null;
}

// React writes a <form action>'s $ACTION_ fields right after <form>, so a browser sends them first
async function startsWithActionField(request: Request, contentType: string): Promise<boolean> {
  const prefix = `--${contentType.split("boundary=")[1]}\r\nContent-Disposition: form-data; name="$ACTION_`;
  const reader = request.body!.pipeThrough(new TextDecoderStream()).getReader();
  let head = "";
  while (head.length < prefix.length) {
    const { done, value } = await reader.read();
    if (done) break;
    head += value;
  }
  void reader.cancel();
  return head.startsWith(prefix);
}

// Undefined when the body has more than `limit` bytes: reading stops there, so a bigger body is never buffered whole
async function readBody(request: Request, limit: number): Promise<string | FormData | undefined> {
  let size = 0;
  const body = request.body?.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > limit) controller.error(new Error("The body is too large"));
        else controller.enqueue(chunk);
      },
    })
  );
  const limited = new Response(body, { headers: request.headers });
  // encodeReply() sends FormData when an argument holds a file or a form, else a string
  const read = request.headers.get("content-type")?.startsWith("multipart/") ? limited.formData() : limited.text();
  return read.catch((error: unknown) => {
    if (size > limit) return undefined;
    throw error;
  });
}

// Browsers already refuse a cross-site POST that carries ACTION_HEADER unless a CORS preflight allows it; this check
// doesn't depend on that
function isCrossSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  // Without either header, the request isn't from a browser
  return fetchSite ? fetchSite !== "same-origin" : !!origin && origin !== new URL(request.url).origin;
}
