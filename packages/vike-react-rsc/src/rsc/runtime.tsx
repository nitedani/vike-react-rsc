import { decodeAction, decodeFormState, decodeReply, loadServerAction, renderToReadableStream } from "@vitejs/plugin-rsc/rsc";
import type { ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import type { PageContext } from "vike/types";
import { getAbortDigest } from "../abort";
import { getClientApiHint } from "../clientApiHint";
import { getPageElement } from "../integration/getPageElement";
import { getServerComponentImports } from "../serverComponentFlags";
import type { HeadSettings } from "../integration/getHeadSettings";
import "../types/PageContext";
import { runInScope, type Scope } from "./scope";

/** A page's Flight decodes to it; `formState` after a form submitted before hydration, for useActionState() */
export type PagePayload = { root: ReactNode; formState?: ReactFormState };
/** A server action's Flight decodes to it; `page` after rerender(): its `root`, with the browser's new pageContext values */
export type ActionPayload = { returnValue: unknown; page?: { root: ReactNode; passedToClient: PassedToClient } };
/** pageContext values for the browser, serialized as Vike serializes them for a navigation, the key of every passToClient value, and the page's head settings */
export type PassedToClient = { json: string | ReadableStream<Uint8Array>; keys: string[]; headSettings: HeadSettings };
/** What runs a server action: a call from JavaScript, an action's or rsc()'s load of a server component, with the action's
 * id and its encoded arguments, or a form submitted before hydration */
export type ActionCallInput = { kind: "action" | "componentLoad"; id: string; body: string | FormData } | { kind: "form"; form: FormData };
/** What the running action builds: its return value, and whether it called rerender() */
export type ActionRun = { kind: "ran"; returnValue: unknown; rerender: boolean };
/** `unknownAction`: this build has no such action, e.g. after a deploy */
export type ActionOutcome = ActionRun | { kind: "unknownAction" };

// Per page render, after a form submitted before hydration
const formStates = new WeakMap<PageContext, ReactFormState>();

export function pagePayload(pageContext: PageContext): ReadableStream<Uint8Array> {
  return renderOnRead<PagePayload>({ kind: "page", pageContext }, () => ({
    root: getPage(pageContext),
    formState: formStates.get(pageContext),
  }));
}

/** The Flight of a page that renders without one: only what a form submitted before hydration returned */
export function formStatePayload(pageContext: PageContext): ReadableStream<Uint8Array> {
  return renderOnRead<PagePayload>({ kind: "page", pageContext }, () => ({ root: null, formState: formStates.get(pageContext) }));
}

/** `scopeKind`: "actionOutput" for what an action returned without rerender(), outside rsc(); `passedToClient` with the page */
export function actionPayload(
  pageContext: PageContext,
  returnValue: unknown,
  { scopeKind, passedToClient }: { scopeKind: "page" | "actionOutput"; passedToClient?: PassedToClient }
): ReadableStream<Uint8Array> {
  return renderOnRead<ActionPayload>({ kind: scopeKind, pageContext }, () =>
    passedToClient ? { returnValue, page: { root: getPage(pageContext), passedToClient } } : { returnValue }
  );
}

export async function runAction(pageContext: PageContext, input: ActionCallInput): Promise<ActionOutcome> {
  const outcome: ActionRun = { kind: "ran", returnValue: undefined, rerender: false };
  const scope: Scope = { kind: "action", pageContext, outcome };
  // A form submitted before hydration: its fields name the action
  if (input.kind === "form") {
    const action = await decodeAction(input.form).catch((error: unknown) => {
      console.error("[vike-react-rsc] Couldn't load the server action; the browser loads the page again:", error);
    });
    // E.g. a page rendered before a deploy names an action this build doesn't have
    if (!action) return { kind: "unknownAction" };
    const returnValue = await runInScope(scope, action);
    const formState = await decodeFormState(returnValue, input.form);
    if (formState) formStates.set(pageContext, formState);
    return outcome;
  }
  const [serverFunction, args] = await Promise.all([
    loadServerAction(input.id).catch((error: unknown) => {
      console.error("[vike-react-rsc] Couldn't load the server action; the browser gets a 404:", error);
    }),
    decodeReply(input.body),
  ]);
  // E.g. a tab opened before a deploy calls an action this build doesn't have
  if (typeof serverFunction !== "function") return { kind: "unknownAction" };
  outcome.returnValue = await runInScope(scope, () => serverFunction(...args));
  return outcome;
}

// The Flight starts rendering when its stream is first read: for a page, that's after data(), and never if nobody
// reads it. A reader that stops early, e.g. because the client left, aborts the render.
function renderOnRead<Payload>(scope: Scope, getPayload: () => Payload): ReadableStream<Uint8Array> {
  const { pageContext } = scope;
  const stopped = new AbortController();
  let chunks: AsyncIterator<Uint8Array> | undefined;
  const render = () =>
    runInScope(scope, () =>
      renderToReadableStream(getPayload(), {
        signal: stopped.signal,
        onError: (error: unknown) => {
          // A `throw redirect()` or `throw render()`: the HTML render, or the browser, acts on it
          const abortDigest = getAbortDigest(error);
          if (abortDigest) return abortDigest;
          // Not the abort, nor what failed because of it
          if (stopped.signal.aborted) return;
          const hint = getClientApiHint(error, undefined, getServerComponentImports(pageContext));
          console.error(`[vike-react-rsc] A server component, or a value sent to the browser, failed${hint ? `: ${hint}` : ""}:`, error);
        },
      })
    );
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        chunks ??= render().values();
        const { done, value } = await chunks.next();
        if (!done) return controller.enqueue(value);
        controller.close();
      },
      cancel: () => stopped.abort(),
    },
    // Nothing is read ahead, so the first read starts the render
    { highWaterMark: 0 }
  );
}

// The Page, inside its Layouts, inside its Wrappers. With Loading.layout, each of them shows it while what it wraps
// suspends.
function getPage(pageContext: PageContext): ReactNode {
  if (!pageContext.config.Page) throw new Error(`[vike-react-rsc] The page ${pageContext.pageId} has no Page: add a +Page file`);
  return getPageElement(pageContext);
}
