import { tinyassert } from "@hiogawa/utils";
import envName from "virtual:enviroment-name";
tinyassert(envName === "ssr", "Invalid environment");

import { enhance, type UniversalMiddleware } from "@universal-middleware/core";

//@ts-ignore
const serverActionMiddleware: UniversalMiddleware =
  envName === "ssr" &&
  enhance(
    async (request) => {
      const runtimeRsc = await import("virtual:runtime/server");
      const req = request;
      const actionId = req.headers.get("x-rsc-action");
      const pageId = req.headers.get("x-vike-page-id");

      if (!actionId) {
        return new Response("Missing action ID", { status: 400 });
      }

      if (!pageId) {
        return new Response("Missing page ID", { status: 400 });
      }

      const contentType = req.headers.get("content-type");
      const body = contentType?.startsWith("multipart/form-data")
        ? await req.formData()
        : await req.text();

      const actionResultStream = await runtimeRsc.handleServerAction({
        actionId,
        pageId,
        body,
      });

      return new Response(actionResultStream, {
        headers: {
          "content-type": "text/x-component;charset=utf-8",
        },
      });
    },
    {
      name: "server-action-handler",
      method: "POST",
      path: "/_server-action",
    }
  );

export default serverActionMiddleware;
