import type { ComponentType, ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import type { ImportString, PageContextClient } from "vike/types";
import type { ActionCall } from "./ssr/action";
import type { Cookies } from "./ssr/cookies";

/** A page's Flight decodes to it; `formState` after a form submitted before hydration, for useActionState() */
export type PagePayload = { root: ReactNode; formState?: ReactFormState };
/** A server action's Flight decodes to it; `root` is the page, after rerender(), with the browser's new pageContext values */
export type ActionPayload = { returnValue: unknown } & ({} | { root: ReactNode; passedToClient: PassedToClient });
/** pageContext values for the browser, serialized as Vike serializes them for a navigation, and the key of every passToClient value */
export type PassedToClient = { json: string | ReadableStream<Uint8Array>; keys: string[] };
export type ActionOutcome = { returnValue: unknown; rerender: boolean; isUnknownAction?: boolean };

/** How the ssr env reaches the rsc env, the only one that can render server components and run server actions */
export type RscRuntime = typeof import("./rsc/runtime");

type RenderClientHook = (pageContext: PageContextClient) => void;
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
      /** The page's Flight: inlined in the HTML, or streamed in the pageContext a navigation fetches. For a page that renders as in vike-react, only useActionState()'s state after a form submitted before hydration. */
      rscPayload?: ReadableStream<Uint8Array>;
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
      /** Where a Page, Layout, Wrapper or Loading's `layout` without a directive runs, as a + file or imported by a +config file: on the server (`'server'`, React's default) or in the browser (`'client'`, as in vike-react). +Loading's `component`, the fallback of rsc(), renders in the browser and the HTML, so a +Loading with `"use server component"` has none. Any other file runs where the file that imports it runs, and `"use client"` at the top of a file puts it in the browser, `"use server component"` on the server. Set once, in the root `+config.js`. Default: `'server'`. */
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
      /** Internal: the rsc env's runtime */
      rscRuntime?: RscRuntime | ImportString;
    }

    interface ConfigResolved {
      Page?: () => ReactNode | Promise<ReactNode>;
      Head?: HeadValue[];
      Layout?: WrapperComponent[];
      Wrapper?: WrapperComponent[];
      Loading?: LoadingValue;
      onBeforeRenderClient?: Function[];
      onAfterRenderClient?: Function[];
      rscRuntime: RscRuntime;
    }
  }
}
