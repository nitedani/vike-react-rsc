import type { PageContextServer } from "vike/types";
import { getRscRunner } from "../vite-plugin-vike-rsc";
import { streamToString } from "./utils/streamToString";

export async function onBeforeRender(pageContext: PageContextServer) {
  console.log("[Vike Hook] +onBeforeRender called.");
  const rscRunner = getRscRunner();
  if (!rscRunner) throw new Error("RSC runner not found in onRenderHtml");
  const renderPageRsc = await rscRunner!
    .import(new URL("./renderPageRsc.tsx", import.meta.url).pathname)
    .then((m) => m.default || m);
  const Page = await rscRunner!
    .import(pageContext.configEntries.Page[0].configDefinedByFile!)
    .then((m) => m.default || m.Page);
  const rscPayloadStream: ReadableStream<Uint8Array> = renderPageRsc(Page);
  const rscPayloadString = pageContext.isClientSideNavigation
    ? await streamToString(rscPayloadStream)
    : null;

  return {
    pageContext: {
      rscPayloadString,
      rscPayloadStream,
    },
  };
}
