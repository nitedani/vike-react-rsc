import type { ComponentType, ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import type { ImportString, PageContext } from "vike/types";
import type { ActionCall } from "./ssr/action";
import type { HtmlInjection, Viewport } from "./ssr/onRenderHtml";
import type { Cookies } from "./ssr/cookies";
import type { TagAttributes } from "./utils/getTagAttributesString.js";

/** A page's Flight decodes to it; `formState` after a form submitted before hydration, for useActionState() */
export type PagePayload = { root: ReactNode; formState?: ReactFormState };
/** A server action's Flight decodes to it; `root` is the page, after rerender() */
export type ActionPayload = { returnValue: unknown; root?: ReactNode };
export type ActionOutcome = { returnValue: unknown; rerender: boolean; isUnknownAction?: boolean };

/** How the ssr env reaches the rsc env, the only one that can render server components and run server actions */
export type RscRuntime = typeof import("./rsc/runtime");

type WrapperComponent = (props: { children: ReactNode }) => ReactNode | Promise<ReactNode>;
export type HeadValue = ReactNode | (() => ReactNode);
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

    interface PageContextServer {
      /** The request's cookies: `get()`, `getAll()` and `has()`, and `set()` and `delete()`, which add a `Set-Cookie` header to the response. Not yet in your own `+onCreatePageContext`, which runs before vike-react-rsc's. */
      cookies: Cookies;
    }

    interface Config {
      /** The page's component: a server component, or a client component. @see https://vike.dev/Page */
      Page?: (() => ReactNode | Promise<ReactNode>) | ImportString;
      /** Tags for the page's `<head>`: an element, or a component, which can call `usePageContext()`. @see https://vike.dev/Head */
      Head?: HeadValue | ImportString;

      /**
       * Set the page's tilte.
       *
       * Generates:
       * ```jsx
       * <head>
       *   <title>{title}</title>
       *   <meta property="og:title" content={title} />
       * </head>
       * ```
       *
       * https://vike.dev/title
       */
      title?: string | null | ((pageContext: PageContext_) => string | null | undefined);

      /**
       * Set the page's description.
       *
       * Generates:
       * ```jsx
       * <head>
       *   <meta name="description" content={description}>
       *   <meta property="og:description" content={description}>
       * </head>
       * ```
       *
       * https://vike.dev/description
       */
      description?: string | null | ((pageContext: PageContext_) => string | null | undefined);

      /**
       * Set the page's preview image upon URL sharing.
       *
       * Generates:
       * ```jsx
       * <head>
       *   <meta property="og:image" content={image}>
       *   <meta name="twitter:card" content="summary_large_image">
       * </head>
       * ```
       *
       * https://vike.dev/image
       */
      image?: string | null | ((pageContext: PageContextServer) => string | null | undefined);

      /**
       * Set the page's width shown to the user on mobile/tablet devices.
       *
       * @default "responsive"
       *
       * https://vike.dev/viewport
       */
      viewport?: Viewport | ((pageContext: PageContextServer) => Viewport | undefined);

      /**
       * Set the page's favicon.
       *
       * Generates:
       * ```jsx
       * <head>
       *   <link rel="icon" href={favicon} />
       * </head>
       * ```
       *
       * https://vike.dev/favicon
       */
      favicon?: string | null | ((pageContext: PageContextServer) => string | null | undefined);

      /**
       * Set the page's language (`<html lang>`).
       *
       * @default 'en'
       *
       * https://vike.dev/lang
       */
      lang?: string | null | ((pageContext: PageContext_) => string | null | undefined);

      /**
       * Raw HTML injected at the start of `<body>`.
       *
       * https://vike.dev/bodyHtmlBegin
       */
      bodyHtmlBegin?: HtmlInjection;

      /**
       * Raw HTML injected at the end of `<body>`.
       *
       * https://vike.dev/bodyHtmlEnd
       */
      bodyHtmlEnd?: HtmlInjection;

      /**
       * Raw HTML injected at the start of `<head>`.
       *
       * https://vike.dev/headHtmlBegin
       */
      headHtmlBegin?: HtmlInjection;

      /**
       * Raw HTML injected at the end of `<head>`.
       *
       * https://vike.dev/headHtmlEnd
       */
      headHtmlEnd?: HtmlInjection;

      /**
       * Add tag attributes such as `<html class="dark">`.
       *
       * https://vike.dev/htmlAttributes
       */
      htmlAttributes?: TagAttributes | ((pageContext: PageContextServer) => TagAttributes | undefined);

      /**
       * Add tag attributes such as `<body class="dark">`.
       *
       * https://vike.dev/bodyAttributes
       */
      bodyAttributes?: TagAttributes | ((pageContext: PageContextServer) => TagAttributes | undefined);

      /**
       * Add tag attributes to the root element such as `<div id="root" role="none">`.
       *
       * https://vike.dev/rootAttributes
       */
      rootAttributes?: TagAttributes | ((pageContext: PageContextServer) => TagAttributes | undefined);

      /** A server component around the page, e.g. its navigation and footer. With several, the one closest to the page is innermost. @see https://vike.dev/Layout */
      Layout?: WrapperComponent | ImportString;
      /** A server component around the page and all its layouts. @see https://vike.dev/Wrapper */
      Wrapper?: WrapperComponent | ImportString;
      /** What shows while something loads. @see https://vike.dev/Loading */
      Loading?: LoadingValue | ImportString;
      rsc?: {
        /** For how many milliseconds rsc() reuses a component it loaded, instead of loading it again. `0` turns that off. Default: 60 000. A navigation always loads the page. */
        staleTime?: number;
        /** The most bytes a server action's request body may have; a bigger one gets a 413. Default: 1 048 576 (1 MB). */
        bodySizeLimit?: number;
      };
      /** Internal: the rsc env's runtime */
      rscRuntime?: RscRuntime | ImportString;
    }

    interface ConfigResolved {
      Page?: () => ReactNode | Promise<ReactNode>;
      Head?: HeadValue[];
      bodyHtmlBegin?: HtmlInjection[];
      bodyHtmlEnd?: HtmlInjection[];
      headHtmlBegin?: HtmlInjection[];
      headHtmlEnd?: HtmlInjection[];
      bodyAttributes?: TagAttributes[];
      htmlAttributes?: TagAttributes[];
      rootAttributes?: TagAttributes[];
      Layout?: WrapperComponent[];
      Wrapper?: WrapperComponent[];
      Loading?: LoadingValue;
      rscRuntime: RscRuntime;
    }
  }
}

// Be able to reference it from within `namespace Vike`
// - https://stackoverflow.com/questions/46559021/typescript-use-of-global-type-inside-namespace-with-same-type
// - https://github.com/Microsoft/TypeScript/issues/983
type PageContext_ = PageContext;
