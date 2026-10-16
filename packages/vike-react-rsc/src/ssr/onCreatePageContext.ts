import type { PageContextServer } from "vike/types";
import { getRsc } from "./bridge";
import { createCookies } from "./cookies";

export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  pageContext.cookies = createCookies(pageContext);
  await pageContext.rscAction?.run(pageContext);
  const { runtime, pageContext: rscPageContext } = getRsc(pageContext);
  pageContext.rscPayload = runtime.pagePayload(rscPageContext);
}
