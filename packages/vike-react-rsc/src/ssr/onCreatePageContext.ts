import type { PageContextServer } from "vike/types";
import { rendersFlight } from "../rendersFlight";
import { getRsc } from "./bridge";
import { createCookies } from "./cookies";

export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  pageContext.cookies = createCookies(pageContext);
  const call = pageContext.rscAction;
  await call?.run(pageContext);
  // Without rerender(), a plain action's answer is its return value alone, which reads nothing guard() and data() provide
  if (call?.outcome && !call.isForm && !call.isRscLoad && !call.outcome.rerender) pageContext._skipGuardAndData_experimentalRSC = true;
  // A server action's answer renders the page itself: Vike would otherwise send this Flight along with rerender()'s values
  if (call && !call.isForm) return;
  const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
  // The rsc env's pageContext: under ssr: false, the server env doesn't load the page's files
  if (rendersFlight(rscPageContext)) pageContext.rscPayload = runtime.pagePayload(rscPageContext);
  // Rendered without a Flight: only what a form submitted before hydration returned, for useActionState()
  else if (call?.isForm) pageContext.rscPayload = runtime.formStatePayload(rscPageContext);
}
