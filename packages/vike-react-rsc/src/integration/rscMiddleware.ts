import { tinyassert } from "@hiogawa/utils";
import envName from "virtual:enviroment-name";
tinyassert(envName === "ssr", "Invalid environment");

import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { renderPage } from "vike/server";
import type { PageContextServer } from "vike/types";

//@ts-ignore
const serverActionMiddleware: UniversalMiddleware =
  envName === "ssr" &&
  enhance(
    async (request) => {
      const runtimeRsc = await import("virtual:runtime/server").then(
        (m) => m.default
      );
      const req = request;
      const actionId = req.headers.get("x-rsc-action");
      const urlOriginal = req.headers.get("x-vike-urloriginal");

      if (!urlOriginal) {
        return new Response("Missing x-vike-urloriginal header", {
          status: 400,
        });
      }

      const contentType = req.headers.get("content-type");
      const body = contentType?.startsWith("multipart/form-data")
        ? await req.formData()
        : await req.text();

      const { promise, resolve } =
        Promise.withResolvers<
          Awaited<ReturnType<typeof runtimeRsc.handleServerAction>>
        >();

      renderPage({
        urlOriginal,
        handleServerAction: actionId
          ? (pageContext: PageContextServer) =>
              // We escape renderPage here
              resolve(
                runtimeRsc.handleServerAction({
                  actionId,
                  pageContext,
                  body,
                })
              )
          : null,
        handleNavigation: !actionId
          ? (pageContext: PageContextServer) =>
              resolve(runtimeRsc.renderPageRsc(pageContext))
          : null,
      });

      return new Response(await promise, {
        headers: {
          "content-type": "text/x-component;charset=utf-8",
        },
      });
    },
    {
      name: "rsc-handler",
      method: ["GET", "POST"],
      path: "/_rsc",
    }
  );

export default serverActionMiddleware;
