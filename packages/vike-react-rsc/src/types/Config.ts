import type React from "react";
import type { ImportString, PageContext } from "vike/types";
import type { RscAction, RscConfig, RscPayload } from "../types";

// https://vike.dev/meta#typescript
declare global {
  namespace Vike {
    interface PageContext {
      /** The page rendered as Flight (RSC payload), streamed to the client. */
      rscPayload?: ReadableStream<Uint8Array>;
      /** Server-side: the server action of this request (integration/actionMiddleware.ts) */
      rscAction?: RscAction;
    }

    interface Config {
      /**
       * The page's root React component.
       *
       * https://vike.dev/Page
       */
      Page?: () => React.ReactNode;

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

      /** Renders the RSC payload. Runs in the rsc environment. */
      renderRsc?: RenderRsc | ImportString;

      /** Runs the server action of pageContext.rscAction. Runs in the rsc environment. */
      runServerAction?: RunServerAction | ImportString;
    }
    interface ConfigResolved {
      renderRsc: RenderRsc;
      runServerAction: RunServerAction;
      Wrapper?: Wrapper[];
      Layout?: Layout[];
      Head?: Head[];
    }
  }
}

export type Head = React.ReactNode | (() => React.ReactNode);
type Wrapper = (props: { children: React.ReactNode }) => React.ReactNode;
type Layout = Wrapper;
type Loading = {
  component?: () => React.ReactNode;
  layout?: () => React.ReactNode;
};
type RenderRsc = (
  pageContext: PageContext,
  payload?: RscPayload
) => Promise<ReadableStream<Uint8Array>>;
type RunServerAction = (pageContext: PageContext) => Promise<{ returnValue: unknown; rerender: boolean }>;
