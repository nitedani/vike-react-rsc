import type { PageContext, PageContextServer } from "vike/types";

/** How the ssr env reaches the rsc env, the only one that can render server components and run server actions */
export type RscRuntime = typeof import("../rsc/runtime");

/** The rsc env's side of this request: its runtime, and its pageContext, whose config holds the rsc-only settings */
export function getRsc(pageContext: PageContextServer): { runtime: RscRuntime; pageContext: PageContext } {
  const rsc = pageContext.environments!.rsc!;
  return { runtime: rsc.config.rscRuntime, pageContext: rsc.pageContext };
}
