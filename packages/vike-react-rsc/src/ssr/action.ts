// Vike loads +middleware at startup, before Vite optimizes React, so neither this module nor its imports may import React
import { enhance } from "@universal-middleware/core";
import { getPageContextJson } from "vike/__internal";
import { getGlobalContext } from "vike/server";
import type { PageContextServer } from "vike/types";
import { getHeadSettings } from "../integration/getHeadSettings";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, RSC_LOAD_HEADER, UNKNOWN_ACTION_HEADER } from "../protocol";
import type { ActionOutcome, PassedToClient } from "../rsc/runtime";
import { getRsc } from "./bridge";

/** One action request, across Vike's phases: it runs in onCreatePageContext, and holds its answer until Vike's response is
 * known. The rsc env runs it with `id` and `body`; without `id`, `body` is a form submitted before hydration. `isRscLoad`
 * when rsc() calls it to load a server component. */
export class ActionCall {
  /** The Set-Cookie lines the action appended to pageContext.headersResponse */
  #setCookies: string[] = [];
  /** Set once the action returned */
  outcome?: ActionOutcome;
  #rsc?: ReturnType<typeof getRsc>;
  #running?: Promise<ActionOutcome>;

  constructor(
    readonly id: string | undefined,
    readonly body: string | FormData,
    readonly url: string,
    readonly isRscLoad: boolean
  ) {}

  // Vike creates a pageContext for every page it renders, and an error or a `throw render()` makes it render another
  // page for the same request: only the first one runs the action, and the others wait for it
  async run(pageContext: PageContextServer): Promise<void> {
    if (this.#rsc) {
      await this.#running?.catch(() => {});
      return;
    }
    this.#rsc = getRsc(pageContext);
    const before = pageContext.headersResponse.getSetCookie().length;
    try {
      this.#running = this.#rsc.runtime.runAction(this.#rsc.pageContext, this);
      this.outcome = await this.#running;
    } finally {
      this.#setCookies = pageContext.headersResponse.getSetCookie().slice(before);
    }
  }

  /** A form submitted before hydration: the answer is the page's HTML */
  get isForm(): boolean {
    return this.id === undefined;
  }

  /** Called by JavaScript: the answer is Flight, which renderAnswer() renders */
  get answersWithFlight(): boolean {
    return !this.isForm;
  }

  /** Without rerender(), a plain action's answer is its return value alone, which reads nothing guard() and data() provide */
  get skipsGuardAndData(): boolean {
    return !!this.outcome && this.answersWithFlight && !this.isRscLoad && !this.outcome.rerender;
  }

  /** The answer for the page Vike rendered: the return value, and the page after rerender() */
  renderAnswer(pageContext: PageContextServer): ReadableStream<Uint8Array> {
    const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
    // No outcome: the action threw. After render() to a page, the answer is that page, as for a form; Vike's error
    // page (is404 set) is left out, as callServer() rejects on its status without reading it
    const { returnValue, rerender } = this.outcome ?? { returnValue: undefined, rerender: pageContext.is404 === null };
    const passedToClient = rerender ? getPassedToClient(pageContext) : undefined;
    return runtime.actionPayload(rscPageContext, returnValue, { passedToClient, withoutPage: this.skipsGuardAndData });
  }

  /** The answer to the action, from the response of the page Vike rendered */
  async answer(response: Response): Promise<Response> {
    // Vike answers once one +onCreatePageContext throws, without waiting for the action
    await this.#running?.catch(() => {});
    const { status } = response;
    if (this.outcome?.isUnknownAction) return this.#answerUnknownAction(response);
    const headers = this.#headersWithCookies(response);
    // The page, or a redirect a browser follows
    if (this.isForm) return new Response(response.body, { status, headers });

    // Without rerender() the answer is the return value, not the page: a failure or a redirect after the action, also
    // in the guard() or data() an rsc() load runs, is dropped (actionRedirectMiddleware made redirects REDIRECT_HEADER)
    if (this.outcome && !this.outcome.rerender && (status !== 200 || response.headers.has(REDIRECT_HEADER))) {
      return this.#answerReturnValue(response, this.outcome.returnValue);
    }
    return new Response(response.body, { status, headers });
  }

  #answerUnknownAction(response: Response): Response {
    void response.body?.cancel();
    // A form can't reload as callServer() does, so the browser gets the page again, from this build
    if (this.isForm) {
      const { pathname, search } = new URL(this.url);
      return new Response(null, { status: 303, headers: { location: pathname + search } });
    }
    return new Response(null, { status: 404, headers: { [UNKNOWN_ACTION_HEADER]: "1" } });
  }

  // The hooks' headers, then the action's
  #headersWithCookies(response: Response): Headers {
    const headers = new Headers(response.headers);
    // Vike sends them, except on the error page it renders after an error
    const sent = headers.getSetCookie();
    for (const setCookie of this.#setCookies) if (!sent.includes(setCookie)) headers.append("set-cookie", setCookie);
    return headers;
  }

  #answerReturnValue(response: Response, returnValue: unknown): Response {
    void response.body?.cancel();
    const { runtime, pageContext } = this.#rsc!;
    const body = runtime.actionPayload(pageContext, returnValue, { withoutPage: this.skipsGuardAndData });
    return new Response(body, {
      headers: new Headers([...this.#setCookies.map((setCookie): [string, string] => ["set-cookie", setCookie]), ["content-type", FLIGHT_CONTENT_TYPE]]),
    });
  }
}

// The keys let the browser drop a value the server no longer sets, as a navigation's new pageContext doesn't have it
function getPassedToClient(pageContext: PageContextServer): PassedToClient {
  const keys = (pageContext.config.passToClient ?? [])
    .flat()
    // Vike's Config type also takes { prop, once }, which its resolved type leaves out
    .map((prop: string | { prop: string }) => (typeof prop === "string" ? prop : prop.prop))
    // The top-level key: 'user' for 'user.id', and '\\.' is a dot in a key
    .map((prop) => prop.split(/(?<!\\)\./)[0]!.replace(/\\\./g, "."));
  // The browser has only the config of the page Vike showed, and an answer may render another page, e.g. after a throw render()
  return { json: getPageContextJson(pageContext), keys, headSettings: getHeadSettings(pageContext) };
}

// Vike's +middleware. When the request calls a server action, it hands the action to the page that Vike renders after
// every middleware. onCreatePageContext runs the action there, before guard() and data(), so they see what the action
// changed, and the action sees the context that every middleware set.
export async function rscMiddleware(
  request: Request,
  context: object
): Promise<Response | ((response: Response) => Promise<Response>) | undefined> {
  if (request.method !== "POST") return;
  const id = request.headers.get(ACTION_HEADER) ?? undefined;
  const limit = (await getGlobalContext()).config.rsc?.bodySizeLimit ?? 1024 * 1024;
  const form = id ? undefined : await getActionForm(request, limit);
  if (form === null) return;
  if (isCrossSite(request)) return new Response(null, { status: 403 });

  const body = id ? await readBody(request, limit) : form;
  if (body === undefined) return new Response(null, { status: 413 });
  const call = new ActionCall(id, body, request.url, request.headers.has(RSC_LOAD_HEADER));
  // A middleware returns either context or a response function: the context is the object Vike merges into the page's
  // pageContext, so it gets the action directly
  Object.assign(context, { rscAction: call });
  return (response: Response) => call.answer(response);
}

// Before every other +middleware, so its response function runs first, before answer()'s, on whatever answered a server
// action called by JS: fetch() would follow a redirect into the Flight decoder, so callServer() gets the target in a
// header and navigates
function redirectInHeader(request: Request): ((response: Response) => Response) | undefined {
  if (request.method !== "POST" || !request.headers.has(ACTION_HEADER)) return;
  return (response) => {
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return response;
    void response.body?.cancel();
    const headers = new Headers(response.headers);
    headers.delete("location");
    headers.set(REDIRECT_HEADER, location);
    return new Response(null, { headers });
  };
}
export const actionRedirectMiddleware: typeof redirectInHeader = enhance(redirectInHeader, { name: "vike-react-rsc:server-action-redirect", order: -Infinity });

// React renders a form whose action is a server function as a multipart POST with $ACTION_ fields, for a submit
// before hydration, which the browser sends as a navigation. Read from a copy: any other POST reaches the next handler
// with its body. Null if the request isn't such a form, undefined for a <form action> over `limit` or of unknown size.
async function getActionForm(request: Request, limit: number): Promise<FormData | undefined | null> {
  // Reading part of a fetch() upload breaks its connection's next request when the route doesn't read the rest
  if (request.headers.get("sec-fetch-mode") !== "navigate") return null;
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data")) return null;
  // @vikejs/express hands the next handler a body only if a middleware read at most 1 MiB of it, the default limit
  // TODO: a bigger limit loses such a body: the next handler gets it empty, or a 413 once
  // https://github.com/magne4000/universal-middleware/pull/457 is released
  const length = request.headers.get("content-length");
  if (length === null || Number(length) > limit) {
    return (await startsWithActionField(request.clone(), contentType)) ? undefined : null;
  }
  // A <button formAction>'s $ACTION_ fields come where the button is, after the fields before it
  const form = await readBody(request.clone(), limit).catch(() => null);
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
