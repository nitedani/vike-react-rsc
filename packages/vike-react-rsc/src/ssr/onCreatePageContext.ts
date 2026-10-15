import type { PageContextServer } from "vike/types";
import { getRsc } from "./bridge";

export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
  pageContext.rscPayload = runtime.renderPage(rscPageContext);
  const call = pageContext.rscAction;
  if (!call) return;
  await call.run(pageContext);
  pageContext.headers = call.withActionCookies(pageContext.headers);
}
