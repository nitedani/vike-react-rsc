import type { PageContextServer } from "vike/types";
import { getRsc } from "./bridge";
import { createCookies } from "./cookies";

export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  pageContext.cookies = createCookies(pageContext);
  await pageContext.rscAction?.run(pageContext);
  // A server action's answer renders the page itself: Vike would otherwise send this Flight along with rerender()'s values
  if (pageContext.rscAction && !pageContext.rscAction.isForm) return;
  const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
  pageContext.rscPayload = runtime.pagePayload(rscPageContext);
}
