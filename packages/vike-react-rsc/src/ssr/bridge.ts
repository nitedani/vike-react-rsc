import type { PageContext, PageContextServer } from "vike/types";
import type { RscRuntime } from "../types";

/** The rsc env's side of this request: its runtime, and its pageContext, whose config holds the rsc-only settings */
export function getRsc(pageContext: PageContextServer): { runtime: RscRuntime; pageContext: PageContext } {
  const rsc = pageContext.environments?.rsc;
  if (!rsc) throw new Error("[vike-react-rsc] Vike didn't load the rsc environment: use a Vike version with Vike environments");
  return { runtime: rsc.config.rscRuntime, pageContext: rsc.pageContext };
}
