import { tinyassert } from "@hiogawa/utils";
import environmentName from "virtual:environment-name";
tinyassert(environmentName === "client", "Invalid environment");

import { startTransition } from "react";
import {
  createFromFetch,
  encodeReply,
  setServerCallback,
  createFromReadableStream,
} from "@vitejs/plugin-rsc/browser";
import { navigate } from "vike/client/router";
import type { RscPayload } from "../types";
import { invalidateServerComponentCache } from "./cache";
import { getGlobalClientState } from "./client/globalState";
import { RSC_CONTENT_TYPE, RSC_REDIRECT_HEADER } from "../constants";

async function callServer(id: string, args: unknown[]): Promise<unknown> {
  const globalState = getGlobalClientState();
  const isRscCall = globalState.isRscCall;

  tinyassert(globalState.pageContext, "Missing page context");
  const pageContextAtCall = globalState.pageContext;
  const responsePromise = fetch(globalState.pageContext.urlOriginal, {
    method: "POST",
    headers: {
      accept: RSC_CONTENT_TYPE,
      "x-rsc-action": id,
      ...(isRscCall ? { "x-rsc-component-call": "true" } : {}),
    },
    body: await encodeReply(args),
  });
  // A throw redirect() during the action, guard() or data() (integration/actionMiddleware.ts)
  const redirect = (await responsePromise).headers.get(RSC_REDIRECT_HEADER);
  if (redirect) {
    window.location.assign(redirect);
    // Keep the caller pending while the browser replaces this document
    return new Promise<never>(() => {});
  }
  const result = await createFromFetch<RscPayload>(responsePromise);
  if (result.error) {
    throw new Error(`[vike-react-rsc] RSC request failed: ${result.error.reason}`);
  }

  // The user navigated away meanwhile: the payload belongs to the old page
  if (result.root && globalState.pageContext === pageContextAtCall) {
    startTransition(() => {
      globalState.setPayload?.((current) => {
        return {
          pageContext: current.pageContext,
          payload: result,
        };
      });
    });
  }

  if (!isRscCall) {
    invalidateServerComponentCache();
  }

  return result.returnValue;
}

setServerCallback(callServer);

if (import.meta.hot) {
  import.meta.hot.on("rsc:update", () => {
    invalidateServerComponentCache();
    // Navigating to the current URL fetches the new payload.
    const { pathname, search, hash } = location;
    navigate(pathname + search + hash, { keepScrollPosition: true });
  });
}

export async function parseRscStream(
  stream: ReadableStream<Uint8Array>
): Promise<RscPayload> {
  return createFromReadableStream<RscPayload>(stream);
}
