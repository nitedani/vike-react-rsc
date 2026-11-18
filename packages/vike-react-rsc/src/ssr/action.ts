// Vike loads +middleware at startup, before Vite optimizes React, so neither this module nor its imports may import React
import { enhance } from "@universal-middleware/core";
import { getGlobalContext } from "vike/server";
import type { PageContextServer } from "vike/types";
import { getPassedToClient } from "../edges/vikeServer";
import { getHeadSettings } from "../integration/getHeadSettings";
import { ACTION_HEADER, FLIGHT_CONTENT_TYPE, REDIRECT_HEADER, RSC_LOAD_HEADER, UNKNOWN_ACTION_HEADER } from "../protocol";
import type { ActionCallInput, ActionOutcome } from "../rsc/runtime";
import "../types/PageContext";
import { getRsc } from "./bridge";

/** One action request, across Vike's phases: it runs in onCreatePageContext, and holds its answer until Vike's response is
 * known. The rsc env runs its `input`. */
export class ActionCall {
  /** The Set-Cookie lines the action appended to pageContext.headersResponse */
  #setCookies: string[] = [];
  /** Set once the action returned */
  outcome?: ActionOutcome;
  #rsc?: ReturnType<typeof getRsc>;
  #running?: Promise<ActionOutcome>;

  constructor(
    readonly input: ActionCallInput,
    readonly url: string
  ) {}

  get kind(): ActionCallInput["kind"] {
    return this.input.kind;
  }

  // Vike creates a pageContext for every page it renders, and an error or a `throw render()` makes it render another
  // page for the same request: only the first one runs the action, and the others wait for it
  async run(pageContext: PageContextServer): Promise<void> {
    if (this.#running) {
      await this.#running.catch(() => {});
      return;
    }
    this.#rsc = getRsc(pageContext);
    const before = pageContext.headersResponse.getSetCookie().length;
    try {
      this.#running = this.#rsc.runtime.runAction(this.#rsc.pageContext, this.input);
      this.outcome = await this.#running;
    } finally {
      this.#setCookies = pageContext.headersResponse.getSetCookie().slice(before);
    }
  }

  /** A call from JavaScript: its answer is Flight. A form submitted before hydration gets the page's HTML. */
  get answersWithFlight(): boolean {
    return this.kind !== "form";
  }

  /** Without rerender(), a plain action's answer is its return value alone, which reads nothing guard() and data() provide */
  get skipsGuardAndData(): boolean {
    return !!this.outcome && this.kind === "action" && !(this.outcome.kind === "ran" && this.outcome.rerender);
  }

  /** The answer for the page Vike rendered: the return value, and the page after rerender() */
  renderAnswer(pageContext: PageContextServer): ReadableStream<Uint8Array> {
    const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
    // No outcome: the action threw. After render() to a page, the answer is that page, as for a form; Vike's error
    // page is left out, as callServer() rejects on its status without reading it
    const { returnValue, rerender } = this.outcome?.kind === "ran" ? this.outcome : { returnValue: undefined, rerender: !this.outcome && isPageAfterRender(pageContext) };
    // The browser has only the config of the page Vike showed, and an answer may render another page, e.g. after a throw render()
    const passedToClient = rerender ? { ...getPassedToClient(pageContext), headSettings: getHeadSettings(pageContext) } : undefined;
    return runtime.actionPayload(rscPageContext, returnValue, { scopeKind: this.#scopeKind, passedToClient });
  }

  /** The answer to the action, from the response of the page Vike rendered */
  async answer(response: Response): Promise<Response> {
    // Vike answers once one +onCreatePageContext throws, without waiting for the action
    await this.#running?.catch(() => {});
    const { status } = response;
    if (this.outcome?.kind === "unknownAction") return this.#answerUnknownAction(response);
    const headers = this.#headersWithCookies(response);
    // The page, or a redirect a browser follows
    if (this.kind === "form") return new Response(response.body, { status, headers });

    // Without rerender() the answer is the return value, not the page: a failure or a redirect after the action, also
    // in the guard() or data() an rsc() load runs, is dropped (actionRedirectMiddleware made redirects REDIRECT_HEADER)
    if (this.outcome && !this.outcome.rerender && (status !== 200 || response.headers.has(REDIRECT_HEADER))) {
      return this.#answerReturnValue(response, this.outcome.returnValue);
    }
    return new Response(response.body, { status, headers });
  }

  // What the answer's server components read: the page, unless guard() and data() didn't run for it
  get #scopeKind(): "page" | "actionOutput" {
    return this.skipsGuardAndData ? "actionOutput" : "page";
  }

  #answerUnknownAction(response: Response): Response {
    void response.body?.cancel();
    // A form can't reload as callServer() does, so the browser gets the page again, from this build
    if (this.kind === "form") {
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

  // A new response, with only the action's cookies: the headers of the failure or the redirect it replaces aren't its own
  #answerReturnValue(response: Response, returnValue: unknown): Response {
    void response.body?.cancel();
    const { runtime, pageContext } = this.#rsc!;
    const body = runtime.actionPayload(pageContext, returnValue, { scopeKind: this.#scopeKind });
    return new Response(body, {
      headers: new Headers([...this.#setCookies.map((setCookie): [string, string] => ["set-cookie", setCookie]), ["content-type", FLIGHT_CONTENT_TYPE]]),
    });
  }
}

// Not Vike's error page, whose is404 is set: after the action's `throw render()`, the page it rendered
function isPageAfterRender(pageContext: PageContextServer): boolean {
  return pageContext.is404 === null;
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
  if (form?.kind === "notAnActionForm") return;
  if (isCrossSite(request)) return new Response(null, { status: 403 });

  const input = id ? await readCall(request, id, limit) : form;
  if (!input || input.kind === "tooLarge") return new Response(null, { status: 413 });
  const call = new ActionCall(input, request.url);
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

type TooLarge = { kind: "tooLarge" };
type ActionForm = Extract<ActionCallInput, { kind: "form" }>;

// React renders a form whose action is a server function as a multipart POST with $ACTION_ fields, for a submit
// before hydration, which the browser sends as a navigation. Read from a copy: any other POST reaches the next handler
// with its body. `tooLarge` for a <form action> over `limit` or of unknown size.
async function getActionForm(request: Request, limit: number): Promise<ActionForm | TooLarge | { kind: "notAnActionForm" }> {
  const notAnActionForm = { kind: "notAnActionForm" } as const;
  // Reading part of a fetch() upload breaks its connection's next request when the route doesn't read the rest
  if (request.headers.get("sec-fetch-mode") !== "navigate") return notAnActionForm;
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data")) return notAnActionForm;
  // Under @vikejs/express, the next handler gets an empty body if this reads more than 1 MiB of it, the default limit
  const length = request.headers.get("content-length");
  if (length === null || Number(length) > limit) {
    return (await startsWithActionField(request.clone(), contentType)) ? { kind: "tooLarge" } : notAnActionForm;
  }
  // A <button formAction>'s $ACTION_ fields come where the button is, after the fields before it
  const form = await readBody(request.clone(), limit).catch(() => null);
  return form instanceof FormData && [...form.keys()].some((key) => /^\$ACTION_(ID|REF)_/.test(key)) ? { kind: "form", form } : notAnActionForm;
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

// rsc() marks its loads with RSC_LOAD_HEADER
async function readCall(request: Request, id: string, limit: number): Promise<ActionCallInput | TooLarge> {
  const body = await readBody(request, limit);
  if (body === undefined) return { kind: "tooLarge" };
  return { kind: request.headers.has(RSC_LOAD_HEADER) ? "componentLoad" : "action", id, body };
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
