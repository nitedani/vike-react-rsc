export { config as default };

import type { Config } from "vike/types";
import { vikeRscPlugin } from "./vite";

const config: Config = {
  name: "vike-react-rsc",
  // Placeholder: Vike 0.4.260 lacks the response API, streamed pageContext values and Vike environments; pin the first release with them
  require: {
    vike: ">=0.4.260",
  },
  // https://vike.dev/onRenderHtml
  onRenderHtml: "import:vike-react-rsc/__internal/ssr:onRenderHtml",
  // https://vike.dev/onRenderClient
  onRenderClient: "import:vike-react-rsc/__internal/browser:onRenderClient",

  rscRuntime: "import:vike-react-rsc/__internal/rsc:rscRuntime",
  // https://vike.dev/middleware
  // `as never`: Vike types `middleware` without ImportString
  middleware: "import:vike-react-rsc/__internal/ssr:actionMiddleware" as never,

  // https://vike.dev/onCreatePageContext
  onCreatePageContext: "import:vike-react-rsc/__internal/ssr:onCreatePageContext",
  passToClient: ["rscPayload"],

  // https://vike.dev/clientRouting
  clientRouting: true,
  // `Page` is loaded only in the rsc env, while Vike's client hooks hydrate the Flight payload and navigate
  clientHooks: true,
  hydrationCanBeAborted: true,

  // https://vike.dev/meta
  meta: {
    // The rsc() cache setting, unrelated to the rsc env: only the browser's rsc() cache reads it
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
      // `layout` wraps the page in the rsc env; `component` is rsc()'s fallback, which SSR renders too
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

import "./types.js";
