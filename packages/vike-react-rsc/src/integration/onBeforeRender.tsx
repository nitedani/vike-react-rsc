import type { PageContextServer, OnBeforeRenderAsync } from "vike/types";
import envName from "virtual:environment-name";

//@ts-ignore
export const onBeforeRender: OnBeforeRenderAsync =
  envName === "ssr" &&
  async function (pageContext: PageContextServer) {
    if (pageContext.handleServerAction) {
      // We escape Vike here (see serverActionMiddleware)
      pageContext.handleServerAction(pageContext);
      return;
    }
    if (pageContext.handleNavigation) {
      // We escape Vike here (see serverActionMiddleware)
      pageContext.handleNavigation(pageContext);
      return;
    }
  };
