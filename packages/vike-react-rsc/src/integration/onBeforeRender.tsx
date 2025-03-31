import type { PageContextServer, OnBeforeRenderAsync } from "vike/types";
import { streamToString } from "./utils/streamToString";
import runtimeServer from "virtual:runtime/server";

export const onBeforeRender: OnBeforeRenderAsync = async function (
  pageContext: PageContextServer
) {
  console.log("[Vike Hook] +onBeforeRender called.");
  const rscPayloadStream = await runtimeServer.renderPageRsc(pageContext);
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
