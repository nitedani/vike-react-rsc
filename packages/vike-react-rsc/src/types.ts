import type { ComponentType, ReactNode } from "react";
import type { HydrationOptions, ReactFormState, RootOptions } from "react-dom/client";
import type { ServerOptions } from "react-dom/server";
import type { renderToStream, RenderToStreamOptions } from "react-streaming/server.web";
import type { ImportString, PageContext, PageContextClient, PageContextServer } from "vike/types";
import type { ActionCall } from "./ssr/action";
import type { Cookies } from "./ssr/cookies";
import type { HtmlInjection, Viewport } from "./ssr/onRenderHtml";
import type { TagAttributes } from "./utils/getTagAttributesString";

/** A page's Flight decodes to it; `formState` after a form submitted before hydration, for useActionState() */
export type PagePayload = { root: ReactNode; formState?: ReactFormState };
/** A server action's Flight decodes to it; `root` is the page, after rerender(), with the browser's new pageContext values */
export type ActionPayload = { returnValue: unknown } & ({} | { root: ReactNode; passedToClient: PassedToClient });
/** pageContext values for the browser, serialized as Vike serializes them for a navigation, and the key of every passToClient value */
export type PassedToClient = { json: string | ReadableStream<Uint8Array>; keys: string[] };
export type ActionOutcome = { returnValue: unknown; rerender: boolean; isUnknownAction?: boolean };

export type ReactOptions = {
  /**
   * Options passed to React's `hydrateRoot()`.
   *
   * https://react.dev/reference/react-dom/client/hydrateRoot
   * https://vike.dev/react-setting
   */
  hydrateRootOptions?: HydrationOptions;
  /**
   * Options passed to React's `createRoot()`.
   *
   * https://react.dev/reference/react-dom/client/createRoot
   * https://vike.dev/react-setting
   */
  createRootOptions?: RootOptions;
  /**
   * Options passed to React's `renderToString()` in vike-react, which renders a page whose `+stream` neither enables nor
   * requires streaming (`false`, or not set). Server components render only to a stream, so they go to the stream's
   * render, over the `streamOptions` of `renderToStreamOptions`.
   *
   * https://react.dev/reference/react-dom/server/renderToString
   * https://vike.dev/react-setting
   */
  renderToStringOptions?: ServerOptions;
  /**
   * Options passed to `react-streaming`'s `renderToStream()`, which renders the first load's HTML. When pre-rendering,
   * only `streamOptions` apply.
   *
   * https://github.com/brillout/react-streaming#options
   * https://vike.dev/react-setting
   */
  renderToStreamOptions?: RenderToStreamOptions;
};

/** How the ssr env reaches the rsc env, the only one that can render server components and run server actions */
export type RscRuntime = typeof import("./rsc/runtime");

type PageHtmlStream = Awaited<ReturnType<typeof renderToStream>>;
type StreamSetting = boolean | "node" | "web" | { type?: "node" | "web"; require?: boolean; enable?: boolean | null };
type RenderHtmlHook = (pageContext: PageContextServer) => void;
type RenderClientHook = (pageContext: PageContextClient) => void;
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
      /** The page's Flight: inlined in the HTML, or streamed in the pageContext a navigation fetches. For a page that renders as in vike-react, only useActionState()'s state after a form submitted before hydration. */
      rscPayload?: ReadableStream<Uint8Array>;
      /** On the server, while it answers a server action */
      rscAction?: ActionCall;
    }

    interface PageContextServer {
      /** The request's cookies: `get()`, `getAll()` and `has()`, and `set()` and `delete()`, which add a `Set-Cookie` header to the response. Not yet in your own `+onCreatePageContext`, which runs before vike-react-rsc's. */
      cookies: Cookies;
      /** The +Page.jsx component rendered to the HTML string, as from vike-react's renderToString(), on a page whose `+stream` neither enables nor requires streaming. +onAfterRenderHtml can replace it. */
      pageHtmlString?: string;
      /** The +Page.jsx component rendered to an HTML stream. +onAfterRenderHtml can replace it. */
      pageHtmlStream?: PageHtmlStream;
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

      /** A component around the page, e.g. its navigation and footer. With several, the one closest to the page is innermost. @see https://vike.dev/Layout */
      Layout?: WrapperComponent | ImportString;
      /** A component around the page and all its layouts. @see https://vike.dev/Wrapper */
      Wrapper?: WrapperComponent | ImportString;
      /** What shows while something loads. @see https://vike.dev/Loading */
      Loading?: LoadingValue | ImportString;
      rsc?: {
        /** For how many milliseconds rsc() reuses a component it loaded, instead of loading it again. `0` turns that off. Default: 60 000. A navigation always loads the page. */
        staleTime?: number;
        /** The most bytes a server action's request body may have; a bigger one gets a 413. Default: 1 048 576 (1 MB). */
        bodySizeLimit?: number;
      };
      /** Where a Page, Layout, Wrapper or Loading's `layout` without a directive runs, as a + file or imported by a +config file: on the server (`'server'`, React's default) or in the browser (`'client'`, as in vike-react). Under `'client'`, one without a directive that imports a `"use server component"` file, directly or through files without a directive, runs on the server. +Loading's `component`, the fallback of rsc(), renders in the browser and the HTML, so a +Loading with `"use server component"` has none. Any other file runs where the file that imports it runs, and `"use client"` at the top of a file puts it in the browser, `"use server component"` on the server. Set once, in the root `+config.js`. Default: `'server'`. */
      components?: "client" | "server";
      /**
       * If `true`, the page is rendered twice: on the server-side (to HTML) and on the client-side (hydration).
       *
       * If `false`, the first load's HTML has no page and the browser renders it, under either `components` value. Server
       * components still render on the server.
       *
       * @default true
       *
       * https://vike.dev/ssr
       */
      ssr?: boolean;
      /**
       * Settings for HTML Streaming. Server components render only to a stream, so the first load's HTML streams unless
       * this turns it off, as in vike-react with `stream.require`. `false` sends the HTML at once, every Suspense boundary
       * resolved. The stream is a Web Stream, whatever `type` says.
       *
       * https://vike.dev/stream
       */
      stream?: StreamSetting;
      /** @deprecated Set +stream.require instead */
      streamIsRequired?: boolean;
      /**
       * Hook called right before rendering the page's root React component to HTML.
       *
       * https://vike.dev/onBeforeRenderHtml
       */
      onBeforeRenderHtml?: RenderHtmlHook | ImportString;
      /**
       * Hook called right after rendering the page's root React component to HTML.
       *
       * https://vike.dev/onAfterRenderHtml
       */
      onAfterRenderHtml?: RenderHtmlHook | ImportString;
      /**
       * Client-side hook called before the page is rendered.
       *
       * https://vike.dev/onBeforeRenderClient
       */
      onBeforeRenderClient?: RenderClientHook | ImportString;
      /**
       * Client-side hook called after the page is rendered.
       *
       * https://vike.dev/onAfterRenderClient
       */
      onAfterRenderClient?: RenderClientHook | ImportString;
      /**
       * Options passed to React functions such as `createRoot()` or `hydrateRoot()`.
       *
       * https://vike.dev/react-setting
       */
      react?: ReactOptions | ((pageContext: PageContext) => ReactOptions) | ImportString;
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
      stream?: StreamSetting[];
      onBeforeRenderHtml?: Function[];
      onAfterRenderHtml?: Function[];
      onBeforeRenderClient?: Function[];
      onAfterRenderClient?: Function[];
      react?: (ReactOptions | ((pageContext: PageContext) => ReactOptions))[];
      rscRuntime: RscRuntime;
    }
  }
}

// Be able to reference it from within `namespace Vike`
// - https://stackoverflow.com/questions/46559021/typescript-use-of-global-type-inside-namespace-with-same-type
// - https://github.com/Microsoft/TypeScript/issues/983
type PageContext_ = PageContext;
