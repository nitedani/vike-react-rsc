import type { Config, PageContextServer } from "vike/types";

// As vike-react's examples/full sets it, for its `stream: false` page
export default (_pageContext: PageContextServer) =>
  ({
    renderToStringOptions: { identifierPrefix: "vrr-string-" },
  }) satisfies Config["react"];
