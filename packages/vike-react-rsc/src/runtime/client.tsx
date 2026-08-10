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
import type { PageContextClient } from "vike/types";
import type { RscPayload } from "../types";
import {
  cachePayload,
  getCachedPayload,
  invalidateCache,
  clearPendingServerComponentRequests,
  invalidateServerComponentCache,
} from "./cache";
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
        cachePayload(current.pageContext, result);
        return {
          pageContext: current.pageContext,
          payload: result,
        };
      });
    });
  } else if (
    !isRscCall &&
    typeof window !== "undefined" &&
    globalState.pageContext
  ) {
    invalidateCache(globalState.pageContext);
  }

  if (!isRscCall) {
    invalidateServerComponentCache();
  }

  return result.returnValue;
}

setServerCallback(callServer);

if (import.meta.hot) {
  import.meta.hot.on("rsc:update", async () => {
    const globalState = getGlobalClientState();
    invalidateCache(getGlobalClientState().pageContext!);
    invalidateServerComponentCache();
    const payload = await fetchNavigationPayload(globalState.pageContext!);
    globalState.setPayload?.((current) => {
      return {
        pageContext: current.pageContext,
        payload,
      };
    });
  });
}

export function prepareNavigation(pageContext: PageContextClient): void {
  const globalState = getGlobalClientState();

  clearPendingServerComponentRequests();
  globalState.navigationPromise = undefined;

  const cachedPayload = getCachedPayload(pageContext);
  if (cachedPayload) {
    globalState.navigationPromise = Promise.resolve(cachedPayload);
    return;
  }

  if (globalState.pageContext?.rscPayloadString) return;
  globalState.navigationPromise = fetchNavigationPayload(pageContext);
}

export function getNavigationPayload(
  pageContext: PageContextClient
): Promise<RscPayload> | undefined {
  const prefetchedPayload = getGlobalClientState().navigationPromise;
  if (prefetchedPayload) return prefetchedPayload;

  const { rscPayloadString } = pageContext;
  if (!rscPayloadString) return;

  const payloadPromise = resolveRscPayload(
    createFromReadableStream<RscPayload>(new Blob([rscPayloadString]).stream())
  );
  payloadPromise.then((payload) => cachePayload(pageContext, payload));
  return payloadPromise;
}

function fetchNavigationPayload(
  pageContext: PageContextClient
): Promise<RscPayload> {
  const fetchPromise = fetchRscPayload(pageContext.urlOriginal, {
    method: "GET",
  });

  fetchPromise.then((payload: RscPayload) => {
    cachePayload(pageContext, payload);
  });
  return fetchPromise;
}

export async function parseRscStream(
  stream: ReadableStream<Uint8Array>
): Promise<RscPayload> {
  return createFromReadableStream<RscPayload>(stream);
}
