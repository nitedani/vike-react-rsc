import type { PageContextServer } from "vike/types";
import { rendersFlight } from "../rendersFlight";
import { getRsc } from "./bridge";
import { createCookies } from "./cookies";

export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  pageContext.cookies = createCookies(pageContext);
  await pageContext.rscAction?.run(pageContext);
  const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
  if (rendersFlight(pageContext)) pageContext.rscPayload = runtime.pagePayload(rscPageContext);
  // Rendered without a Flight: only what a form submitted before hydration returned, for useActionState()
  else if (pageContext.rscAction?.isForm) pageContext.rscPayload = runtime.formStatePayload(rscPageContext);
}
