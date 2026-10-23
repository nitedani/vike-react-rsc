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
  onError: "import:vike-react-rsc/__internal/onError:onError",
  // Vike's type doesn't list import strings, which it accepts
  // TODO: remove the cast once https://github.com/vikejs/vike/pull/3627 is released
  middleware: [
    "import:vike-react-rsc/__internal/middleware:actionRedirectMiddleware",
    "import:vike-react-rsc/__internal/middleware:rscMiddleware",
  ] as never,
  rscRuntime: "import:vike-react-rsc/__internal/rsc:rscRuntime",
  passToClient: ["rscPayload"],
  clientRouting: true,
  // Under components: 'server', the browser has no Page to load: its onRenderClient decodes the Flight
  clientHooks: true,
  hydrationCanBeAborted: true,
  components: "server",

  // Remove <ClientOnly> children on server
  staticReplace: [
    {
      env: "server",
      filter: "vike-react-rsc/ClientOnly",
      type: "call",
      match: {
        function: ["import:react/jsx-runtime:jsx", "import:react/jsx-runtime:jsxs", "import:react/jsx-dev-runtime:jsxDEV"],
        args: { 0: "import:vike-react-rsc/ClientOnly:ClientOnly" },
      },
      remove: { arg: 1, prop: "children" },
    },
    {
      env: "server",
      filter: "vike-react-rsc/ClientOnly",
      type: "call",
      match: { function: "import:react:createElement", args: { 0: "import:vike-react-rsc/ClientOnly:ClientOnly" } },
      remove: { argsFrom: 2 },
    },
    {
      env: "server",
      filter: "vike-react-rsc/useHydrated",
      type: "call",
      match: { function: "import:vike-react-rsc/useHydrated:useHydrated" },
      replace: { with: false },
    },
  ],

  meta: {
    // Before components, whose effect overrides Page, Layout and Wrapper's env under components: 'server'. The server
    // render reads it to leave the page out of the HTML.
    ssr: { env: { config: true, server: true, client: true }, effect: ssrEffect },
    // The plugin reads it too, and checks that all pages have the same value. The rsc env, to tell whether a page renders
    // from its Flight.
    components: {
      env: { config: true, rsc: true },
      effect: ({ configDefinedAt, configValue }) => {
        if (configValue !== "client" && configValue !== "server") throw new Error(`${configDefinedAt} should be "client" or "server"`);
        // Under 'client', a page without server components renders as in vike-react, so its + files load everywhere
        if (configValue === "server") return { meta: { Page: { env: { rsc: true } }, Layout: { env: { rsc: true } }, Wrapper: { env: { rsc: true } } } };
      },
    },
    Page: { env: { rsc: true, server: true, client: true } },
    Layout: { env: { rsc: true, server: true, client: true }, cumulative: true },
    Wrapper: { env: { rsc: true, server: true, client: true }, cumulative: true },
    // rsc() renders `component` in the browser and the HTML, and `layout` renders where the +Loading file runs
    Loading: { env: { rsc: true, server: true, client: true } },
    Head: { env: { server: true }, cumulative: true },
    stream: { env: { server: true }, cumulative: true },
    streamIsRequired: { env: { server: true } },
    onBeforeRenderHtml: { env: { server: true }, cumulative: true },
    onAfterRenderHtml: { env: { server: true }, cumulative: true },
    onBeforeRenderClient: { env: { client: true }, cumulative: true },
    onAfterRenderClient: { env: { client: true }, cumulative: true },
    react: { cumulative: true, env: {} },
    // vike-react's head settings; title, description and lang also apply on client navigation
    title: { env: { server: true, client: true } },
    description: { env: { server: true, client: true } },
    image: { env: { server: true } },
    viewport: { env: { server: true } },
    favicon: { env: { server: true }, global: true },
    lang: { env: { server: true, client: true } },
    bodyHtmlBegin: { env: { server: true }, cumulative: true, global: true },
    bodyHtmlEnd: { env: { server: true }, cumulative: true, global: true },
    headHtmlBegin: { env: { server: true }, cumulative: true, global: true },
    headHtmlEnd: { env: { server: true }, cumulative: true, global: true },
    // cumulative for Vike extensions
    htmlAttributes: { env: { server: true }, global: true, cumulative: true },
    bodyAttributes: { env: { server: true }, global: true, cumulative: true },
    rootAttributes: { env: { server: true }, global: true, cumulative: true },
    // rsc() reads it in the browser, the action middleware on the server; unrelated to the rsc env
    rsc: { env: { client: true, server: true }, global: true },
    rscRuntime: { env: { rsc: true } },
  },

  vite: { plugins: vikeReactRscPlugins() },
};

export default vikeReactRsc;
