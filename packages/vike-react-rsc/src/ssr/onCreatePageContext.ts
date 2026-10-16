import type { PageContextServer } from "vike/types";
import { getRsc } from "./bridge";

export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  const call = pageContext.rscAction;
  if (call) {
    await call.run(pageContext);
    pageContext.headers = call.withActionCookies(pageContext.headers);
  }
  const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
  pageContext.rscPayload = runtime.pagePayload(rscPageContext);
}
