import type { PageContextServer, OnBeforeRenderAsync } from "vike/types";
import { streamToString } from "./utils/streamToString";
// imports dist/rsc/index.mjs
import runtimeServer from "virtual:runtime/server";
import envName from "virtual:enviroment-name";

//@ts-ignore
export const onBeforeRender: OnBeforeRenderAsync =
  envName === "ssr" &&
  async function (pageContext: PageContextServer) {
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
