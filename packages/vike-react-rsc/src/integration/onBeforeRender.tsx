import type { PageContextServer, OnBeforeRenderAsync } from "vike/types";
import { getRscRunner } from "../plugin";
import { streamToString } from "./utils/streamToString";
import { PKG_NAME } from "../constants";

export const onBeforeRender: OnBeforeRenderAsync = async function (
  pageContext: PageContextServer
) {
  console.log("[Vike Hook] +onBeforeRender called.");
  const rscRunner = getRscRunner();
  if (!rscRunner) throw new Error("RSC runner not found in onRenderHtml");
  const renderPageRsc = await rscRunner!
    .import(`${PKG_NAME}/__internal/runtime/server`)
    .then((m) => m.default || m);
  const rscPayloadStream: ReadableStream<Uint8Array> = await renderPageRsc(
    pageContext
  );
  const rscPayloadString = pageContext.isClientSideNavigation
    ? await streamToString(rscPayloadStream)
    : null;

  return {
    pageContext: {
      rscPayloadString,
      rscPayloadStream,
    },
  };
};
