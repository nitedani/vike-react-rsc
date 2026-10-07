import environmentName from "virtual:environment-name";
import { tinyassert } from "@hiogawa/utils";
tinyassert(environmentName === "rsc", "Invalid environment");

import { renderToReadableStream, decodeReply, loadServerAction } from '@vitejs/plugin-rsc/rsc'
import type { PageContext } from "vike/types";
import { getPageElement } from "../integration/getPageElement";
import { providePageContext } from "../hooks/pageContext/pageContext-server";
import { provideServerActionContext } from "./serverActionContext";
import type { RscPayload } from "../types";

// A client that navigates away mid-stream cancels the response, which aborts the
// Flight render. React reports that through onError like a render failure: this
// one signature is dropped, everything else surfaces. An AbortError is not enough,
// since an app aborting a fetch in a Server Component throws one too.
function isClientDisconnect(error: unknown): boolean {
  const { code } = (error ?? {}) as { code?: unknown };
  return code === "ERR_STREAM_PREMATURE_CLOSE";
}

const renderOptions = {
  onError(error: unknown) {
    if (isClientDisconnect(error)) return;
    console.error("[vike-react-rsc] Error while rendering the RSC payload:", error);
  },
};

// The `renderRsc` config: Vike runs it in the rsc environment, with the rsc
// config values at pageContext.config
export async function renderRsc(
  pageContext: PageContext,
  payload?: RscPayload
): Promise<ReadableStream<Uint8Array>> {
  if (payload) return renderToReadableStream(payload, renderOptions);
  const { rscAction } = pageContext;
  const root = !rscAction || rscAction.rerender ? await getPageElement(pageContext) : undefined;
  // After a server action: its return value, and the page only if the action called rerender()
  // TODO: add form when initial request is POST
  const rscPayload: RscPayload = rscAction ? { root, returnValue: rscAction.returnValue } : { root };
  return providePageContext(pageContext, () => renderToReadableStream(rscPayload, renderOptions));
}

// The `runServerAction` config: runs the server action of pageContext.rscAction (integration/actionMiddleware.ts)
export async function runServerAction(
  pageContext: PageContext
): Promise<{ returnValue: unknown; rerender: boolean }> {
  const { rscAction } = pageContext;
  tinyassert(rscAction);
  const context = { shouldRerender: false, responseHeaders: rscAction.responseHeaders };
  const [args, action] = await Promise.all([
    decodeReply(rscAction.body),
    loadServerAction(rscAction.actionId),
  ]);
  const returnValue = await provideServerActionContext(context, () =>
    providePageContext(pageContext, () => action.apply(null, args))
  );
  return { returnValue, rerender: context.shouldRerender };
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
