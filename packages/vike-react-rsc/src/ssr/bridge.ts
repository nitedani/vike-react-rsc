import type { PageContext, PageContextServer } from "vike/types";
import type { RscRuntime } from "../types";

/** The rsc env's side of this request: its runtime, and its pageContext, whose config holds the rsc-only settings */
export function getRsc(pageContext: PageContextServer): { runtime: RscRuntime; pageContext: PageContext } {
  const rsc = pageContext.environments!.rsc!;
  return { runtime: rsc.config.rscRuntime, pageContext: rsc.pageContext };
}
