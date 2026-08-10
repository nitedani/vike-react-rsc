export { config as default };

import type { Config } from "vike/types";
import vikeRscPlugin from "./plugin";

const config: Config = {
  name: "vike-react-rsc",
  // Placeholder only: released Vike 0.4.260 doesn't contain the response/content
  // page-context APIs or vike/runtime. Before publishing, pin this to the first
  // Vike release containing those APIs.
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

  // https://vike.dev/clientRouting
  clientRouting: true,
  // `Page` is loaded only by the RSC runtime, while Vike's client hooks still
  // hydrate the Flight payload and handle client-side navigation.
  clientHooks: true,
  hydrationCanBeAborted: true,

  // https://vike.dev/meta
  meta: {
    // Extension setting for RSC cache policy; unrelated to the `rsc` runtime name.
    rsc: {
      env: {
        server: true,
        client: false,
      },
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
      env: { server: false, client: false, rsc: true },
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
