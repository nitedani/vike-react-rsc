import type { Config } from "vike/types";
import "./types.js";
import { vikeReactRscPlugins } from "./vite";

// Users add it with `extends: [vikeReactRsc]`
const vikeReactRsc: Config = {
  name: "vike-react-rsc",
  require: { vike: ">=0.4.268" },

  onCreatePageContext: "import:vike-react-rsc/__internal/ssr:onCreatePageContext",
  onRenderHtml: "import:vike-react-rsc/__internal/ssr:onRenderHtml",
  onRenderClient: "import:vike-react-rsc/__internal/browser:onRenderClient",
  // Vike's type doesn't list import strings, which it accepts
  middleware: "import:vike-react-rsc/__internal/middleware:actionMiddleware" as never,
  rscRuntime: "import:vike-react-rsc/__internal/rsc:rscRuntime",
  passToClient: ["rscPayload"],
  clientRouting: true,
  // The browser has no Page to load: its onRenderClient decodes the Flight
  clientHooks: true,
  hydrationCanBeAborted: true,

  meta: {
    Page: { env: { rsc: true } },
    Layout: { env: { rsc: true }, cumulative: true },
    Wrapper: { env: { rsc: true }, cumulative: true },
    // `layout` renders in the rsc env, `component` in the browser and in the HTML
    Loading: { env: { rsc: true, server: true, client: true } },
    Head: { env: { server: true }, cumulative: true },
    // rsc() reads it in the browser, the action middleware on the server; unrelated to the rsc env
    rsc: { env: { client: true, server: true }, global: true },
    rscRuntime: { env: { rsc: true } },
  },

  vite: { plugins: vikeReactRscPlugins() },
};

export default vikeReactRsc;
