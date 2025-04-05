import type React from "react";
import type { ImportString } from "vike/types";

// https://vike.dev/meta#typescript
declare global {
  namespace Vike {
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
      Head?: Head

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
    }
    interface ConfigResolved {
      Wrapper?: Wrapper[];
      Layout?: Layout[];
      Head?: Head[]
    }
  }
}

export type Head = React.ReactNode | (() => React.ReactNode)
type Wrapper = (props: { children: React.ReactNode }) => React.ReactNode;
type Layout = Wrapper;
type Loading = {
  component?: () => React.ReactNode;
  layout?: () => React.ReactNode;
};
