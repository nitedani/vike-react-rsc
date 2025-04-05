export { config as default };

import type { Config } from "vike/types";
import vikeRscPlugin from "./plugin";

//@ts-expect-error
const config: Config = {
  name: "vike-react-rsc",
  require: {
    vike: ">=0.4.182",
  },
  // https://vike.dev/onRenderHtml
  onRenderHtml:
    "import:vike-react-rsc/__internal/integration/onRenderHtml:onRenderHtml",
  // https://vike.dev/onRenderClient
  onRenderClient:
    "import:vike-react-rsc/__internal/integration/onRenderClient:onRenderClient",

  onBeforeRender:
    "import:vike-react-rsc/__internal/integration/onBeforeRender:onBeforeRender",

  client: "import:vike-react-rsc/__internal/integration/client",

  //@ts-expect-error
  middleware:
    "import:vike-react-rsc/__internal/integration/rscMiddleware",

  passToClient: ["rscPayloadString"],

  // https://vike.dev/clientRouting
  clientRouting: true,
  hydrationCanBeAborted: true,

  // https://vike.dev/meta
  meta: {
    onBeforeRender: {
      env: {
        server: true,
        client: false,
      },
    },
    Wrapper: {
      env: { client: true, server: true },
      cumulative: true,
    },
    Layout: {
      env: { server: true, client: true },
      cumulative: true,
    },
    Loading: {
      env: { server: true, client: true },
    },
  },
  vite6BuilderApp: true,
  vite: {
    plugins: [vikeRscPlugin()],
  },
} satisfies Config;

import "./types/Config.js";
