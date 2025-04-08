import { tinyassert } from "@hiogawa/utils";
import envName from "virtual:enviroment-name";
tinyassert(envName === "client", "Invalid environment");

import React, { startTransition } from "react";
//@ts-ignore
import ReactClient from "react-server-dom-webpack/client.browser";
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

function getVikeUrlOriginal(pageContext: PageContextClient) {
  return `${
    pageContext.urlPathname === "/" ? "" : pageContext.urlPathname
  }/index.pageContext.json${pageContext.urlParsed.searchOriginal || ""}`;
}

export async function callServer(
  id: string,
  args: unknown[]
): Promise<RscPayload> {
  const globalState = getGlobalClientState();
  const isRscCall = globalState.isRscCall;
  console.log(
    "[RSC Client] Calling server action:",
    id,
    isRscCall ? "(from server component)" : ""
  );

  const result = await ReactClient.createFromFetch<RscPayload>(
    fetch("/_rsc", {
      method: "POST",
      headers: {
        "x-rsc-action": id,
        // Skip onRenderHtml, but get access to pageContext for RSC render
        // Make Vike think this is a "navigation", skipping onRenderHtml
        "x-vike-urloriginal": getVikeUrlOriginal(globalState.pageContext!),
        // Add a header to indicate if this is a server component call
        ...(isRscCall ? { "x-rsc-component-call": "true" } : {}),
      },
      body: await ReactClient.encodeReply(args),
    }),
    { callServer }
  );

  // Only update the UI if the response contains a root component
  // This happens when the server action called rerender()
  if (result.root) {
    console.log("[RSC Client] Server action triggered re-render");

    startTransition(() => {
      // Update the UI with the new payload
      globalState.setPayload?.((current) => {
        // Cache the result for future navigation
        cachePayload(current.pageContext, result);

        // Update the payload
        return {
          pageContext: current.pageContext,
          payload: result,
        };
      });
    });
  } else {
    console.log("[RSC Client] Server action returned without re-render");

    // If this is a server action (not a server component call), invalidate caches
    if (!isRscCall && typeof window !== "undefined") {
      // Invalidate the main RSC cache for the current page if we have a page context
      if (globalState.pageContext) {
        invalidateCache(globalState.pageContext);
      }
    }
  }

  if (!isRscCall) {
    // Always invalidate the server component cache for server actions
    // This is necessary because server actions might change data that server components depend on
    invalidateServerComponentCache();
  }

  return result.returnValue;
}

if (import.meta.hot) {
  import.meta.hot.on("rsc:update", async () => {
    const globalState = getGlobalClientState();
    invalidateCache(getGlobalClientState().pageContext!);
    invalidateServerComponentCache();
    const payload = await onNavigate(globalState.pageContext!);
    globalState.setPayload?.((current) => {
      return {
        pageContext: current.pageContext,
        payload,
      };
    });
  });
}

export function onNavigate(
  pageContext: PageContextClient
): Promise<RscPayload> {
  console.log("[RSC Client] Navigation:", pageContext.urlPathname);

  const globalState = getGlobalClientState();

  // Clear any pending server component requests when navigating
  // This ensures we don't have stale requests when moving between pages
  clearPendingServerComponentRequests();

  // Check for cached payload
  const cachedPayload = getCachedPayload(pageContext);
  if (cachedPayload) {
    globalState.navigationPromise = Promise.resolve(cachedPayload);
    return Promise.resolve(cachedPayload);
  }

  // No cache hit, fetch from server
  console.log("[RSC Client] Fetching RSC payload for", pageContext.urlPathname);
  const fetchPromise = ReactClient.createFromFetch<RscPayload>(
    fetch("/_rsc", {
      method: "GET",
      headers: {
        // Skip onRenderHtml, but get access to pageContext for RSC render
        // Make Vike think this is a "navigation", skipping onRenderHtml
        "x-vike-urloriginal": getVikeUrlOriginal(pageContext),
      },
    }),
    { callServer }
  );

  // Store the promise
  globalState.navigationPromise = fetchPromise;
  fetchPromise.then((payload: RscPayload) => {
    cachePayload(pageContext, payload);
  });
  return fetchPromise;
}

// Function to parse an RSC stream into React nodes
export async function parseRscStream(
  stream: ReadableStream<Uint8Array>
): Promise<RscPayload> {
  console.log("[RSC Client] Parsing RSC stream...");
  const initialPayload =
    await ReactClient.createFromReadableStream<React.ReactNode>(stream, {
      callServer,
    });
  console.log("[RSC Client] RSC stream parsed");
  return initialPayload;
}
