import { createFromReadableStream, setServerCallback } from "@vitejs/plugin-rsc/browser";
import { createRoot, hydrateRoot, type RootOptions } from "react-dom/client";
import { navigate } from "vike/client/router";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import { onCaughtError } from "../browser/AbortBoundary";
import { callServer } from "../browser/callServer";
import { applyHead, getReactRoot, getRootElement, onUncaughtError, rendered, setCurrentPageContext, setReactRoot, show } from "../browser/page";
import { markRscOutputsStale } from "../browser/rsc";
import { findServerComponent } from "../rendersFlight";
import type { PagePayload } from "../rsc/runtime";
import type { PageContextInternal } from "../types/PageContext";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { getBetterErrorLight } from "../utils/getBetterErrorLight";
import { isObject } from "../utils/isObject";
import { getHeadSettings } from "./getHeadSettings";
import { getPageElement } from "./getPageElement";
import { resolveReactOptions } from "./resolveReactOptions";

// Whether a page can render without a Flight, as in vike-react: under components: 'client', and always in dev
declare const __VIKE_REACT_RSC_CLIENT_DEFAULT__: boolean;

setServerCallback(callServer);

export const onRenderClient: OnRenderClientAsync = async (pageContext: PageContextClient & PageContextInternal) => {
  pageContext._headAlreadySet = pageContext.isHydration;
  // Use case:
  // - Store hydration https://github.com/vikejs/vike-react/issues/110
  await callCumulativeHooks(pageContext.config.onBeforeRenderClient, pageContext);
  const { root, formState } = await getPagePayload(pageContext);
  const page = { pageContext, root };
  const rootElement = getRootElement(page);
  pageContext.page = rootElement;
  // Evaluated before the page shows, so a setting that throws reaches Vike; the HTML has the hydrated page's
  const headSettings = pageContext.isHydration ? undefined : getHeadSettings(pageContext);
  setCurrentPageContext(pageContext);
  show(page);
  if (pageContext.isHydration) {
    const container = document.getElementById("root")!;
    const { hydrateRootOptions, createRootOptions } = resolveReactOptions(pageContext);
    // Whether the page was [Server-Side Rendered](https://vike.dev/ssr).
    if ((!__VIKE_REACT_RSC_CLIENT_DEFAULT__ && pageContext.config.ssr !== false) || container.innerHTML !== "") {
      const options = { ...hydrateRootOptions, ...withOurErrorCallbacks(hydrateRootOptions), formState: formState ?? hydrateRootOptions?.formState };
      setReactRoot(hydrateRoot(container, rootElement, options));
    } else {
      const reactRoot = createRoot(container, { ...createRootOptions, ...withOurErrorCallbacks(createRootOptions) });
      setReactRoot(reactRoot);
      reactRoot.render(rootElement);
    }
  }
  pageContext.root = getReactRoot();
  // As vike-react's: Vike ends the navigation once React shows the page, and renders the error page if React throws on
  // it. Or once the user navigates elsewhere: Vike runs the next page's onRenderClient() only once this one ends.
  await rendered(pageContext.abortSignal);
  // The user navigated elsewhere: skip the page's head and +onAfterRenderClient, but keep hydration's, which testing tools wait for
  if (pageContext.abortSignal.aborted && !pageContext.isHydration) return;
  if (!pageContext.isHydration) {
    pageContext._headAlreadySet = true;
    applyHead(headSettings!, pageContext);
  }
  // Use cases:
  // - Custom user settings: https://vike.dev/head-tags#custom-settings
  // - Testing tools: https://github.com/vikejs/vike-react/issues/95
  await callCumulativeHooks(pageContext.config.onAfterRenderClient, pageContext);
};

// Our error callbacks run first, then the user's, as in vike-react
function withOurErrorCallbacks(options: RootOptions | undefined): Pick<RootOptions, "onCaughtError" | "onUncaughtError"> {
  return {
    onCaughtError: (errorOriginal, errorInfo) => {
      const { error, componentStackToLog } = getErrorWithComponentStack(errorOriginal, errorInfo);
      onCaughtError(error, componentStackToLog, errorInfo, options?.onCaughtError);
    },
    onUncaughtError: (errorOriginal, errorInfo) => {
      const { error: errorEnhanced, componentStackToLog } = getErrorWithComponentStack(errorOriginal, errorInfo);
      onUncaughtError(errorEnhanced, componentStackToLog);
      options?.onUncaughtError?.(errorEnhanced, errorInfo);
    },
  };
}
type OnUncaughtErrorInfo = Parameters<NonNullable<RootOptions["onUncaughtError"]>>[1];

// Inject componentStack to the error's stack trace, or else return it as componentStackToLog, to log beside the error
// - Server counterpart: https://github.com/brillout/react-streaming/blob/e0a6210957e65dad2c92877ad075ebac4713d8fa/src/server/renderToStream/common.ts#L93
function getErrorWithComponentStack(errorOriginal: unknown, errorInfo?: OnUncaughtErrorInfo): { error: unknown; componentStackToLog?: string } {
  if (!errorInfo?.componentStack || !isObject(errorOriginal) || typeof errorOriginal.stack !== "string") return { error: errorOriginal };
  const errorStackLines = String(errorOriginal.stack).split("\n");

  // Inject the component stack right before the React stack trace (potentially *after* some vike-react-rsc or react-streaming strack trace, e.g. if react-streaming's useAsync() throws an error).
  // Perfect cutoff (as of react@19.2.0), but can easily break upon React internal refactoring
  let cutoff = errorStackLines.findIndex((l) => l.includes("react_stack_bottom_frame"));
  if (cutoff === -1) {
    // Ideally, we should inject the component stack right before the React stack trace, and *after* any vike-react-rsc or react-streaming strack trace.
    // But we cannot (easily) do that on the client-side, because the URLs of vike-react-rsc's and react-streaming's files also include node_modules and react
    cutoff = errorStackLines.findIndex((l) => l.includes("node_modules") && l.includes("react"));
  }
  // A production build has neither: the component stack goes at the end
  if (cutoff === -1) cutoff = errorStackLines.length;

  const errorStackLinesBegin = errorStackLines.slice(0, cutoff);
  const errorStackLinesEnd = errorStackLines.slice(cutoff);
  const componentStackLines = errorInfo.componentStack.split("\n").filter(Boolean);
  if (componentStackLines[0] === errorStackLinesBegin.at(-1)) componentStackLines.shift();
  const stackEnhanced = [
    //
    ...errorStackLinesBegin,
    ...componentStackLines,
    ...errorStackLinesEnd,
  ].join("\n");

  try {
    const errorBetter = getBetterErrorLight(errorOriginal, { stack: stackEnhanced });
    return { error: errorBetter };
  } catch {
    // A stack that can't be set, e.g. a getter's
    return { error: errorOriginal, componentStackToLog: errorInfo.componentStack };
  }
}

async function getPagePayload(pageContext: PageContextClient): Promise<PagePayload> {
  const flight = pageContext.rscPayload && (await createFromReadableStream<PagePayload>(pageContext.rscPayload));
  if (flight?.root) return flight;
  // A page that renders as in vike-react has no Flight, or only what a form submitted before hydration returned. So has
  // the error page after an error in the browser, whatever its components.
  if (!__VIKE_REACT_RSC_CLIENT_DEFAULT__ || !pageContext.config.Page) throw cannotRenderInBrowser(pageContext, "components: 'server' makes it a server component");
  const serverComponent = findServerComponent(pageContext);
  if (serverComponent) {
    const { file, serverComponentImport } = serverComponent;
    const cause = serverComponentImport ? `${file} imports the server component ${serverComponentImport.at(-1)}` : `${file} starts with "use server component"`;
    throw cannotRenderInBrowser(pageContext, cause);
  }
  return { root: getPageElement(pageContext), formState: flight?.formState };
}

function cannotRenderInBrowser(pageContext: PageContextClient, cause: string): Error {
  return new Error(`[vike-react-rsc] The page ${pageContext.pageId} has to render in the browser, e.g. the error page after an error there, but ${cause}, which renders only on the server`);
}

if (import.meta.hot) {
  // plugin-rsc's signal that a server component changed
  import.meta.hot.on("rsc:update", () => {
    markRscOutputsStale();
    // The change may fix the error Vite's overlay shows
    for (const overlay of document.querySelectorAll("vite-error-overlay")) (overlay as Element & { close(): void }).close();
    // Vike fetches the page's pageContext again, with the new Flight
    void navigate(location.href, { keepScrollPosition: true });
  });
}
