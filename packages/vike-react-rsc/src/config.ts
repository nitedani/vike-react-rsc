export { config as default };

import type { Config } from "vike/types";
import vikeRscPlugin from "./plugin";

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

  onPageTransitionStart:
    "import:vike-react-rsc/__internal/integration/onPageTransitionStart:onPageTransitionStart",

  client: "import:vike-react-rsc/__internal/integration/client",

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
  },
  vite6BuilderApp: true,
  vite: {
    plugins: [vikeRscPlugin()],
  },
} satisfies Config;
