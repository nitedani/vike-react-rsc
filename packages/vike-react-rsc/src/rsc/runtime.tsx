import { decodeAction, decodeFormState, decodeReply, loadServerAction, renderToReadableStream } from "@vitejs/plugin-rsc/rsc";
import type { ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import type { PageContext } from "vike/types";
import { LoadingLayout } from "../components/LoadingLayout";
import { getPageElement } from "../integration/getPageElement";
import type { ActionOutcome, ActionPayload, PagePayload } from "../types";
import { runInScope } from "./scope";

// Per page render, after a form submitted before hydration
const formStates = new WeakMap<PageContext, ReactFormState>();

export function pagePayload(pageContext: PageContext): ReadableStream<Uint8Array> {
  return renderOnRead<PagePayload>(pageContext, () => ({
    root: getPage(pageContext),
    formState: formStates.get(pageContext),
  }));
}

/** The Flight of a page that renders without one: only what a form submitted before hydration returned */
export function formStatePayload(pageContext: PageContext): ReadableStream<Uint8Array> {
  return renderOnRead<PagePayload>(pageContext, () => ({ root: null, formState: formStates.get(pageContext) }));
}

export function actionPayload(
  pageContext: PageContext,
  { returnValue, rerender }: ActionOutcome
): ReadableStream<Uint8Array> {
  return renderOnRead<ActionPayload>(pageContext, () =>
    rerender ? { returnValue, root: getPage(pageContext) } : { returnValue }
  );
}

export async function runAction(
  pageContext: PageContext,
  { id, body }: { id: string | undefined; body: string | FormData }
): Promise<ActionOutcome> {
  const outcome: ActionOutcome = { returnValue: undefined, rerender: false };
  const scope = { pageContext, action: { outcome } };
  // A form submitted before hydration: its fields name the action
  if (id === undefined) {
    const action = await decodeAction(body as FormData).catch((error: unknown) => {
      console.error("[vike-react-rsc] Couldn't load the server action; the browser loads the page again:", error);
    });
    // E.g. a page rendered before a deploy names an action this build doesn't have
    if (!action) return { ...outcome, isUnknownAction: true };
    const returnValue = await runInScope(scope, action);
    const formState = await decodeFormState(returnValue, body as FormData);
    if (formState) formStates.set(pageContext, formState);
    return outcome;
  }
  const [serverFunction, args] = await Promise.all([
    loadServerAction(id).catch((error: unknown) => {
      console.error("[vike-react-rsc] Couldn't load the server action; the browser gets a 404:", error);
    }),
    decodeReply(body),
  ]);
  // E.g. a tab opened before a deploy calls an action this build doesn't have
  if (typeof serverFunction !== "function") return { ...outcome, isUnknownAction: true };
  outcome.returnValue = await runInScope(scope, () => serverFunction(...args));
  return outcome;
}

// The Flight starts rendering when its stream is first read: for a page, that's after data(), and never if nobody
// reads it. A reader that stops early, e.g. because the client left, aborts the render.
function renderOnRead<Payload>(pageContext: PageContext, getPayload: () => Payload): ReadableStream<Uint8Array> {
  const stopped = new AbortController();
  let chunks: AsyncIterator<Uint8Array> | undefined;
  const render = () =>
    runInScope({ pageContext }, () =>
      renderToReadableStream(getPayload(), {
        signal: stopped.signal,
        onError: (error: unknown) => {
          // Not the abort, nor what failed because of it
          if (stopped.signal.aborted) return;
          const hint = getClientApiHint(error);
          console.error(`[vike-react-rsc] A server component failed${hint ? `: ${hint}` : ""}:`, error);
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
  const { config } = pageContext;
  if (!config.Page) throw new Error(`[vike-react-rsc] The page ${pageContext.pageId} has no Page: add a +Page file`);
  if (!isClientReference(config.Loading)) return getPageElement(pageContext);
  // A client +Loading is a client reference here, which has no `layout`. getPageElement() reads only the config.
  return getPageElement(Object.create(pageContext, { config: { value: { ...config, Loading: { layout: LoadingLayout } } } }));
}

function isClientReference(value: unknown): boolean {
  return typeof value === "function" && "$$typeof" in value && value.$$typeof === Symbol.for("react.client.reference");
}

// What a component can call while it renders, but React's server build lacks
const clientApis = [
  "startTransition", "useActionState", "useContext", "useDeferredValue", "useEffect", "useEffectEvent", "useImperativeHandle",
  "useInsertionEffect", "useLayoutEffect", "useOptimistic", "useReducer", "useRef", "useState", "useSyncExternalStore", "useTransition",
];

// For React's TypeError when a server component calls one of them: the component, by the first frame named like one, so
// never a hook's own file. A build's stack names its chunks, not the files.
function getClientApiHint(error: unknown): string | undefined {
  if (!(error instanceof TypeError)) return;
  const api = /(\w+)\)? is not a function/.exec(error.message)?.[1];
  if (!api || !clientApis.includes(api)) return;
  const [, component, file] = /^\s*at ([A-Z][\w$]*) \((.+?):\d+:\d+\)$/m.exec(error.stack ?? "") ?? [];
  const caller = import.meta.env.DEV && file ? file : (component ?? "A server component");
  return `${caller} calls ${api}(), which runs only in the browser, but runs on the server: start ${caller === file ? "it" : "its file"} with "use client"`;
}
