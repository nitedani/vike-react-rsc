import { decodeReply, loadServerAction, renderToReadableStream } from "@vitejs/plugin-rsc/rsc";
import { Suspense, type ReactNode } from "react";
import type { PageContext } from "vike/types";
import { isClientDisconnect } from "../protocol";
import type { ActionOutcome, ActionPayload, ErrorPayload, ErrorReason, PagePayload, RscRuntime } from "../types";
import { provideActionScope, providePageContext } from "./scope";

export const rscRuntime: RscRuntime = { render, renderError, runAction };

const renderOptions = {
  onError(error: unknown) {
    if (isClientDisconnect(error)) return;
    console.error("[vike-react-rsc] Error while rendering the RSC payload:", error);
  },
};

async function render(pageContext: PageContext): Promise<ReadableStream<Uint8Array>> {
  const { rscAction } = pageContext;
  const root = !rscAction || rscAction.outcome?.rerender ? getPageElement(pageContext) : undefined;
  const payload: PagePayload | ActionPayload = rscAction ? { root, returnValue: rscAction.outcome?.returnValue } : { root };
  return providePageContext(pageContext, () => renderToReadableStream(payload, renderOptions));
}

function renderError(reason: ErrorReason): ReadableStream<Uint8Array> {
  return renderToReadableStream<ErrorPayload>({ error: { reason } }, renderOptions);
}

async function runAction(pageContext: PageContext): Promise<ActionOutcome> {
  const { rscAction } = pageContext;
  if (!rscAction) throw new Error("[vike-react-rsc] pageContext.rscAction is missing");
  const scope = { rerender: false, responseHeaders: rscAction.responseHeaders };
  const [args, action] = await Promise.all([decodeReply(rscAction.body), loadServerAction(rscAction.id)]);
  const returnValue = await provideActionScope(scope, () =>
    providePageContext(pageContext, () => action.apply(null, args))
  );
  return { returnValue, rerender: scope.rerender };
}

function getPageElement(pageContext: PageContext): ReactNode {
  const { Page, Loading, Layout = [], Wrapper = [] } = pageContext.config;
  if (!Page) throw new Error(`[vike-react-rsc] Page '${pageContext.pageId}' resolved no Page component.`);
  const withLoading = (node: ReactNode) =>
    Loading?.layout ? <Suspense fallback={<Loading.layout />}>{node}</Suspense> : node;
  let page = withLoading(<Page />);
  for (const Wrap of [...Layout, ...Wrapper]) page = withLoading(<Wrap>{page}</Wrap>);
  return page;
}
