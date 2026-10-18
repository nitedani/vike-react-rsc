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
  // TODO: remove the cast once https://github.com/vikejs/vike/pull/3627 is released
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
    // vike-react's head settings; title, description and lang also apply on client navigation
    title: { env: { server: true, client: true } },
    description: { env: { server: true, client: true } },
    lang: { env: { server: true, client: true } },
    image: { env: { server: true } },
    viewport: { env: { server: true } },
    favicon: { env: { server: true }, global: true },
    htmlAttributes: { env: { server: true }, global: true, cumulative: true },
    bodyAttributes: { env: { server: true }, global: true, cumulative: true },
    rootAttributes: { env: { server: true }, global: true, cumulative: true },
    headHtmlBegin: { env: { server: true }, global: true, cumulative: true },
    headHtmlEnd: { env: { server: true }, global: true, cumulative: true },
    bodyHtmlBegin: { env: { server: true }, global: true, cumulative: true },
    bodyHtmlEnd: { env: { server: true }, global: true, cumulative: true },
    // rsc() reads it in the browser, the action middleware on the server; unrelated to the rsc env
    rsc: { env: { client: true, server: true }, global: true },
    rscRuntime: { env: { rsc: true } },
  },

  vite: { plugins: vikeReactRscPlugins() },
};

export default vikeReactRsc;
