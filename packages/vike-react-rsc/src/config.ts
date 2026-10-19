import type { Config } from "vike/types";
import "./types.js";
import { ssrEffect } from "./integration/ssrEffect";
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
  // Under components: 'server', the browser has no Page to load: its onRenderClient decodes the Flight
  clientHooks: true,
  hydrationCanBeAborted: true,
  components: "server",

  meta: {
    // Before components, whose effect overrides it under components: 'server'
    ssr: { env: { config: true }, effect: ssrEffect },
    // The plugin reads it too, and checks that all pages have the same value
    components: {
      env: { config: true, server: true, client: true },
      // Under 'client', a page without server components renders as in vike-react, so its + files load everywhere
      effect: ({ configValue }) =>
        configValue === "server" ? { meta: { Page: { env: { rsc: true } }, Layout: { env: { rsc: true } }, Wrapper: { env: { rsc: true } } } } : undefined,
    },
    Page: { env: { rsc: true, server: true, client: true } },
    Layout: { env: { rsc: true, server: true, client: true }, cumulative: true },
    Wrapper: { env: { rsc: true, server: true, client: true }, cumulative: true },
    // `layout` renders in the rsc env, `component` in the browser and in the HTML
    Loading: { env: { rsc: true, server: true, client: true } },
    Head: { env: { server: true }, cumulative: true },
    onBeforeRenderClient: { env: { client: true }, cumulative: true },
    // rsc() reads it in the browser, the action middleware on the server; unrelated to the rsc env
    rsc: { env: { client: true, server: true }, global: true },
    rscRuntime: { env: { rsc: true } },
  },

  vite: { plugins: vikeReactRscPlugins() },
};

export default vikeReactRsc;
