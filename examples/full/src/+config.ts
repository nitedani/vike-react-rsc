import type { Config } from "vike/types";
import vikeReactRsc from "vike-react-rsc/config";

export default {
  extends: [vikeReactRsc],
  server: true,
  rsc: { staleTime: 10000 },
  title: "Vike RSC demo",
  description: "A demo of Vike with React Server Components",
  favicon: "/vike.svg",
  // Every page's HTML has them, see testHeadSettings()
  htmlAttributes: { "data-html": "" },
  bodyAttributes: { "data-body": "" },
  rootAttributes: { "data-root": "" },
  headHtmlBegin: "<!-- headHtmlBegin -->",
  headHtmlEnd: "<!-- headHtmlEnd -->",
  bodyHtmlBegin: "<!-- bodyHtmlBegin -->",
  bodyHtmlEnd: "<!-- bodyHtmlEnd -->",
  meta: {
    // Loaded in the rsc environment only: the server reads it at pageContext.environments.rsc.config, see /pages/environments
    greeting: { env: { rsc: true } },
  },
} satisfies Config;

declare global {
  namespace Vike {
    interface Config {
      greeting?: string;
    }
  }
}
