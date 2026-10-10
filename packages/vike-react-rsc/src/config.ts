export { config as default };

import type { Config } from "vike/types";
import { vikeRscPlugin } from "./vite";

const config: Config = {
  name: "vike-react-rsc",
  // Placeholder only: released Vike 0.4.260 doesn't contain the response
  // page-context API, streamed pageContext values or Vike environments. Before
  // publishing, pin this to the first Vike release containing those APIs.
  require: {
    vike: ">=0.4.260",
  },
  // https://vike.dev/onRenderHtml
  onRenderHtml: "import:vike-react-rsc/__internal/ssr:onRenderHtml",
  // https://vike.dev/onRenderClient
  onRenderClient: "import:vike-react-rsc/__internal/browser:onRenderClient",

  onPageTransitionStart: "import:vike-react-rsc/__internal/browser:onPageTransitionStart",
  rscRuntime: "import:vike-react-rsc/__internal/rsc:rscRuntime",
  // https://vike.dev/middleware
  // `as never`: Vike types `middleware` without ImportString
  middleware: "import:vike-react-rsc/__internal/ssr:actionMiddleware" as never,

  // https://vike.dev/onCreatePageContext
  onCreatePageContext: "import:vike-react-rsc/__internal/ssr:onCreatePageContext",
  passToClient: ["rscPayload"],

  // https://vike.dev/clientRouting
  clientRouting: true,
  // `Page` is loaded only by the RSC runtime, while Vike's client hooks still
  // hydrate the Flight payload and handle client-side navigation.
  clientHooks: true,
  hydrationCanBeAborted: true,

  // https://vike.dev/meta
  meta: {
    // Extension setting for RSC cache policy; unrelated to the `rsc` environment
    // name. Only the client's cache of rsc() components reads it.
    rsc: {
      env: { client: true },
      global: true,
    },
    Head: {
      env: { server: true },
      cumulative: true,
    },
    Wrapper: {
      env: { client: false, server: false, rsc: true },
      cumulative: true,
    },
    Layout: {
      env: { server: false, client: false, rsc: true },
      cumulative: true,
    },
    Loading: {
      // `layout` wraps the page in the rsc environment, `component` is the
      // fallback of rsc(), a client component that SSR renders too.
      env: { server: true, client: true, rsc: true },
    },
    Page: {
      env: { server: false, client: false, rsc: true },
    },
    rscRuntime: {
      env: { rsc: true },
    },
  },
  vite: {
    plugins: [vikeRscPlugin()],
  },
} satisfies Config;

import "./types/Config.js";
