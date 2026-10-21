import type { PageContextServer } from "vike/types";
import { rendersFlight } from "../rendersFlight";
import { getRsc } from "./bridge";
import { createCookies } from "./cookies";

export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  pageContext.cookies = createCookies(pageContext);
  await pageContext.rscAction?.run(pageContext);
  // A server action's answer renders the page itself: Vike would otherwise send this Flight along with rerender()'s values
  if (pageContext.rscAction && !pageContext.rscAction.isForm) return;
  const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
  // The rsc env's pageContext: under ssr: false, the server env doesn't load the page's files
  if (rendersFlight(rscPageContext)) pageContext.rscPayload = runtime.pagePayload(rscPageContext);
  // Rendered without a Flight: only what a form submitted before hydration returned, for useActionState()
  else if (pageContext.rscAction?.isForm) pageContext.rscPayload = runtime.formStatePayload(rscPageContext);
}
