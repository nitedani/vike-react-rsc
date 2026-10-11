import type { PageContext, PageContextServer } from "vike/types";
import type { RscRuntime } from "../types";

// The rsc env's view of this request, whose config holds rscRuntime
export function getRsc(pageContext: PageContextServer): { runtime: RscRuntime; pageContext: PageContext } {
  const rsc = pageContext.environments?.rsc;
  if (!rsc) throw new Error("[vike-react-rsc] pageContext.environments.rsc is missing: vike-react-rsc needs a Vike version with Vike environments");
  return { runtime: rsc.config.rscRuntime, pageContext: rsc.pageContext };
}
