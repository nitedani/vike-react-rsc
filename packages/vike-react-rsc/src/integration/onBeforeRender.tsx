import type { PageContextServer, OnBeforeRenderAsync } from "vike/types";
import { streamToString } from "./utils/streamToString";
import runtimeRsc from "virtual:runtime/server";
import envName from "virtual:enviroment-name";

//@ts-ignore
export const onBeforeRender: OnBeforeRenderAsync =
  envName === "ssr" &&
  async function (pageContext: PageContextServer) {
    console.log("[Vike Hook] +onBeforeRender called.");
    if (pageContext.handleServerAction) {
      // We escape Vike here (see serverActionMiddleware)
      pageContext.handleServerAction(pageContext);
      return;
    }

    const rscPayloadStream = await runtimeRsc.renderPageRsc(pageContext);
    const rscPayloadString = pageContext.isClientSideNavigation
      ? await streamToString(rscPayloadStream)
      : null;

    return {
      pageContext: {
        // Pass rscPayloadString to the browser
        rscPayloadString,

        // Forward rscPayloadStream to onRenderHtml
        rscPayloadStream,
      },
    };
  };
