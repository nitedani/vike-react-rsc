export { config as default };

import type { Config } from "vike/types";
import vikeRscPlugin from "./plugin";

const config: Config = {
  name: "vike-react-rsc",
  // Placeholder only: released Vike 0.4.260 doesn't contain the response
  // page-context API, streamed pageContext values or vike/runtime. Before
  // publishing, pin this to the first Vike release containing those APIs.
  require: {
    vike: ">=0.4.260",
  },
  // https://vike.dev/onRenderHtml
  onRenderHtml:
    "import:vike-react-rsc/__internal/integration/onRenderHtml:onRenderHtml",
  // https://vike.dev/onRenderClient
  onRenderClient:
    "import:vike-react-rsc/__internal/integration/onRenderClient:onRenderClient",

  onPageTransitionStart:
    "import:vike-react-rsc/__internal/integration/onPageTransitionStart:onPageTransitionStart",

  // Sets pageContext.rscPayload: the Flight stream, which Vike streams after
  // the pageContext (in the HTML, and in `.pageContext.json` upon navigation).
  onCreatePageContext:
    "import:vike-react-rsc/__internal/integration/onCreatePageContext.server:onCreatePageContext",
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
    // name. Only the client's payload cache reads it, from onPageTransitionStart(),
    // whose pageContext has the global config values only.
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
  },
  vite: {
    plugins: [vikeRscPlugin()],
  },
} satisfies Config;

import "./types/Config.js";
