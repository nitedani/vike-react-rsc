import type { ComponentType, ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import type { ImportString, PageContext, PageContextServer } from "vike/types";
import type { ActionCall } from "./ssr/action";
import type { Cookies } from "./ssr/cookies";

/** A page's Flight decodes to it; `formState` after a form submitted before hydration, for useActionState() */
export type PagePayload = { root: ReactNode; formState?: ReactFormState };
/** A server action's Flight decodes to it; `root` is the page, after rerender() */
export type ActionPayload = { returnValue: unknown; root?: ReactNode };
export type ActionOutcome = { returnValue: unknown; rerender: boolean; isUnknownAction?: boolean };

/** How the ssr env reaches the rsc env, the only one that can render server components and run server actions */
export type RscRuntime = typeof import("./rsc/runtime");

type WrapperComponent = (props: { children: ReactNode }) => ReactNode | Promise<ReactNode>;
type HeadValue = ReactNode | (() => ReactNode);
/** A setting's value, or a function of the pageContext that returns it */
export type Setting<Value, PageContext_ = PageContext> = Value | ((pageContext: PageContext_) => Value);
type HeadString = string | null | undefined;
export type Viewport = "responsive" | number | null | undefined;
export type TagAttributes = Record<string, string | number | boolean | null | undefined>;
type HtmlInjection = Setting<string, PageContextServer>;
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
      /** `<title>` and `og:title`, also updated on client navigation. @see https://vike.dev/title */
      title?: Setting<HeadString>;
      /** `<meta name="description">` and `og:description`, also updated on client navigation. @see https://vike.dev/description */
      description?: Setting<HeadString>;
      /** `<html lang>`, also updated on client navigation. Default: `"en"`; `null` removes it from the HTML, but a client navigation sets `"en"`. @see https://vike.dev/lang */
      lang?: Setting<HeadString>;
      /** `og:image` and `twitter:card`. @see https://vike.dev/image */
      image?: Setting<HeadString, PageContextServer>;
      /** `<meta name="viewport">`. Default: `"responsive"`; `null` removes it. @see https://vike.dev/viewport */
      viewport?: Setting<Viewport, PageContextServer>;
      /** `<link rel="icon">`. @see https://vike.dev/favicon */
      favicon?: Setting<HeadString, PageContextServer>;
      /** @see https://vike.dev/htmlAttributes */
      htmlAttributes?: Setting<TagAttributes, PageContextServer>;
      /** @see https://vike.dev/bodyAttributes */
      bodyAttributes?: Setting<TagAttributes, PageContextServer>;
      /** The attributes of the `<div id="root">` the page renders in. @see https://vike.dev/rootAttributes */
      rootAttributes?: Setting<TagAttributes, PageContextServer>;
      /** Raw HTML at the start of `<head>`. @see https://vike.dev/headHtmlBegin */
      headHtmlBegin?: HtmlInjection;
      /** Raw HTML at the end of `<head>`. @see https://vike.dev/headHtmlEnd */
      headHtmlEnd?: HtmlInjection;
      /** Raw HTML at the start of `<body>`. @see https://vike.dev/bodyHtmlBegin */
      bodyHtmlBegin?: HtmlInjection;
      /** Raw HTML at the end of `<body>`. @see https://vike.dev/bodyHtmlEnd */
      bodyHtmlEnd?: HtmlInjection;
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
      htmlAttributes?: Setting<TagAttributes, PageContextServer>[];
      bodyAttributes?: Setting<TagAttributes, PageContextServer>[];
      rootAttributes?: Setting<TagAttributes, PageContextServer>[];
      headHtmlBegin?: HtmlInjection[];
      headHtmlEnd?: HtmlInjection[];
      bodyHtmlBegin?: HtmlInjection[];
      bodyHtmlEnd?: HtmlInjection[];
      Layout?: WrapperComponent[];
      Wrapper?: WrapperComponent[];
      Loading?: LoadingValue;
      rscRuntime: RscRuntime;
    }
  }
}
