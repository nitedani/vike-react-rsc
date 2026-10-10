import type { ReactNode } from "react";
import type { ImportString, PageContext } from "vike/types";
import type { ActionCall } from "./ssr/action";

/** What a page's Flight decodes to */
export type PagePayload = { root: ReactNode };
/** What an action's Flight decodes to: `root` only after rerender() */
export type ActionPayload = { returnValue: unknown; root?: ReactNode };
/** What a Flight decodes to when the page couldn't render */
export type ErrorPayload = { error: { reason: ErrorReason } };
export type ErrorReason = "not-found" | "error";

export type ActionOutcome = { returnValue: unknown; rerender: boolean };

/** The rsc env's interface to the ssr env: the `rscRuntime` setting */
export type RscRuntime = {
  /** The page, or the action's answer */
  render(pageContext: PageContext): Promise<ReadableStream<Uint8Array>>;
  renderError(reason: ErrorReason): ReadableStream<Uint8Array>;
  runAction(pageContext: PageContext): Promise<ActionOutcome>;
};

export interface RscConfig {
  /** How long (in ms) a component loaded with `rsc()` is considered fresh on the client. Set to 0 to disable caching. Page navigation always fetches. */
  staleTime?: number;
}

export type Head = ReactNode | (() => ReactNode);
type Wrapper = (props: { children: ReactNode }) => ReactNode;
type Layout = Wrapper;
type Loading = {
  component?: () => ReactNode;
  layout?: () => ReactNode;
};

// https://vike.dev/meta#typescript
declare global {
  namespace Vike {
    interface PageContext {
      /** The page rendered as Flight, streamed to the browser */
      rscPayload?: ReadableStream<Uint8Array>;
      /** Server-side: the server action of this request */
      rscAction?: ActionCall;
    }

    interface Config {
      /**
       * The page's root React component.
       *
       * https://vike.dev/Page
       */
      Page?: () => ReactNode | Promise<ReactNode>;

      /**
       * Add arbitrary `<head>` tags.
       *
       * https://vike.dev/Head
       */
      Head?: Head;

      /**
       * A component that defines the visual layout common to several pages.
       *
       * Technically: the `<Layout>` component wraps the root component `<Page>`.
       *
       * https://vike.dev/Layout
       */
      Layout?: Layout;

      /**
       * A component wrapping the the root component `<Page>`.
       *
       * https://vike.dev/Wrapper
       */
      Wrapper?: Wrapper | ImportString;

      /**
       * Define loading animations.
       *
       * https://vike.dev/Loading
       */
      Loading?: Loading | ImportString;

      rsc?: RscConfig;

      /** The rsc env's interface to the ssr env */
      rscRuntime?: RscRuntime | ImportString;
    }
    interface ConfigResolved {
      rscRuntime: RscRuntime;
      Wrapper?: Wrapper[];
      Layout?: Layout[];
      Head?: Head[];
    }
  }
}
