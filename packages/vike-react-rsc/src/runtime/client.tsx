import { tinyassert } from "@hiogawa/utils";
import { environmentName } from "vike/runtime";
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
import { RSC_CONTENT_TYPE } from "../constants";

async function resolveRscPayload(
  payloadPromise: PromiseLike<RscPayload>
): Promise<RscPayload> {
  const payload = await payloadPromise;
  if (payload.redirect) {
    window.location.assign(payload.redirect.url);
    // Keep the Flight thenable pending while the browser replaces this document.
    return new Promise<never>(() => {});
  }
  if (payload.error) {
    throw new Error(
      `[vike-react-rsc] RSC request failed: ${payload.error.reason}`
    );
  }
  return payload;
}

type RscFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

function fetchRscPayload(
  url: string,
  options: RscFetchOptions
): Promise<RscPayload> {
  return resolveRscPayload(
    createFromFetch<RscPayload>(
      fetch(url, {
        ...options,
        headers: {
          accept: RSC_CONTENT_TYPE,
          ...options.headers,
        },
      })
    )
  );
}

async function callServer(id: string, args: unknown[]): Promise<unknown> {
  const globalState = getGlobalClientState();
  const isRscCall = globalState.isRscCall;

  tinyassert(globalState.pageContext, "Missing page context");
  const result = await fetchRscPayload(globalState.pageContext.urlOriginal, {
    method: "POST",
    headers: {
      "x-rsc-action": id,
      ...(isRscCall ? { "x-rsc-component-call": "true" } : {}),
    },
    body: await encodeReply(args),
  });

  if (result.root) {
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
