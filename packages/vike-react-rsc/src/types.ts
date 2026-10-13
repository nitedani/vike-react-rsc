import type { ComponentType, ReactNode } from "react";
import type { ImportString, PageContext } from "vike/types";
import type { ActionCall } from "./ssr/action";

/** A page's Flight decodes to it */
export type PagePayload = { root: ReactNode };
/** A server action's Flight decodes to it; `root` is the page, after rerender() */
export type ActionPayload = { returnValue: unknown; root?: ReactNode };
export type ActionOutcome = { returnValue: unknown; rerender: boolean; isUnknownAction?: boolean };

/** How the ssr env reaches the rsc env, the only one that can render server components and run server actions */
export type RscRuntime = {
  renderPage(pageContext: PageContext): ReadableStream<Uint8Array>;
  renderAnswer(pageContext: PageContext, outcome: ActionOutcome): ReadableStream<Uint8Array>;
  runAction(
    pageContext: PageContext,
    call: { id: string; body: string | FormData; responseHeaders: Headers }
  ): Promise<ActionOutcome>;
};

type WrapperComponent = (props: { children: ReactNode }) => ReactNode | Promise<ReactNode>;
type HeadValue = ReactNode | (() => ReactNode);
type LoadingValue = {
  /** Shown by Suspense while the page, or a Layout or Wrapper, waits for data */
  layout?: ComponentType;
  /** The fallback of a component that rsc() made, until it loads */
  component?: ComponentType;
};

declare global {
  namespace Vike {
    interface PageContext {
      /** The page's Flight: inlined in the HTML, or streamed in the pageContext a navigation fetches */
      rscPayload: ReadableStream<Uint8Array>;
      /** On the server, while it answers a server action */
      rscAction?: ActionCall;
    }

    interface Config {
      /** The page's component: a server component, or a client component. @see https://vike.dev/Page */
      Page?: (() => ReactNode | Promise<ReactNode>) | ImportString;
      /** Tags for the page's `<head>`: an element, or a component, which can call `usePageContext()`. @see https://vike.dev/Head */
      Head?: HeadValue | ImportString;
      /** A server component around the page, e.g. its navigation and footer. With several, the one closest to the page is innermost. @see https://vike.dev/Layout */
      Layout?: WrapperComponent | ImportString;
      /** A server component around the page and all its layouts. @see https://vike.dev/Wrapper */
      Wrapper?: WrapperComponent | ImportString;
      /** What shows while something loads. @see https://vike.dev/Loading */
      Loading?: LoadingValue | ImportString;
      rsc?: {
        /** For how many milliseconds rsc() reuses a component it loaded, instead of loading it again. `0` turns that off. Default: 60 000. A navigation always loads the page. */
        staleTime?: number;
      };
      /** Internal: the rsc env's runtime */
      rscRuntime?: RscRuntime | ImportString;
    }

    interface ConfigResolved {
      Page?: () => ReactNode | Promise<ReactNode>;
      Head?: HeadValue[];
      Layout?: WrapperComponent[];
      Wrapper?: WrapperComponent[];
      Loading?: LoadingValue;
      rscRuntime: RscRuntime;
    }
  }
}
