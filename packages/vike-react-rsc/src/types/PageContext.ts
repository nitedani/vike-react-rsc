import type { JSX, ReactNode } from "react";
import type { Root as ReactRoot } from "react-dom/client";
import type { renderToStream } from "react-streaming/server.web";
import type { ActionCall } from "../ssr/action";
import type { Cookies } from "../ssr/cookies";
import type { ConfigViaHookResolved } from "./Config";

type PageHtmlStream = Awaited<ReturnType<typeof renderToStream>>;

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
      /** The root React element of the page. */
      page?: JSX.Element;
      /** The +Page.jsx component rendered to the HTML string, as from vike-react's renderToString(), on a page whose `+stream` neither enables nor requires streaming. +onAfterRenderHtml can replace it. */
      pageHtmlString?: string;
      /** The +Page.jsx component rendered to an HTML stream. +onAfterRenderHtml can replace it. */
      pageHtmlStream?: PageHtmlStream;
    }

    interface PageContextClient {
      /** The root React element of the page */
      page?: ReactNode;
      /** The React root DOM container */
      root?: ReactRoot;
    }
  }
}

// Internal pageContext properties
export type PageContextInternal = {
  _configViaHook?: ConfigViaHookResolved;
  _headAlreadySet?: boolean;
};
