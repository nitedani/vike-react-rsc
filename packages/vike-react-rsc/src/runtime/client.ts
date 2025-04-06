import { tinyassert } from "@hiogawa/utils";
import envName from "virtual:enviroment-name";
tinyassert(envName === "client", "Invalid environment");

//@ts-ignore
import ReactClient from "react-server-dom-webpack/client.browser";
import type { RscPayload } from "../types";
import type { PageContext } from "vike/types";
import { getCachedPayload, cachePayload } from "./cache";
import { startTransition } from "react";

export async function callServer(
  id: string,
  args: unknown[]
): Promise<RscPayload> {
  console.log("[RSC Client] Calling server action:", id);
  const result = await ReactClient.createFromFetch<RscPayload>(
    fetch("/_rsc", {
      method: "POST",
      headers: {
        "x-rsc-action": id,
        // Skip onRenderHtml, but get access to pageContext for RSC render
        // Make Vike think this is a "navigation", skipping onRenderHtml
        "x-vike-urloriginal": `${
          window.location.pathname === "/" ? "" : window.location.pathname
        }/index.pageContext.json${window.location.search}`,
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
      window.__setPayload((current) => {
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
  }

  return result.returnValue;
}

export async function onNavigate(pageContext: PageContext): Promise<void> {
  console.log("[RSC Client] Navigation:", pageContext.urlPathname);

  // No need to configure cache - staleTime is read directly from pageContext

  // Check for cached payload
  const cachedPayload = getCachedPayload(pageContext);
  if (cachedPayload) {
    window.__navigationPromise = Promise.resolve(cachedPayload);
    return;
  }

  // No cache hit, fetch from server
  console.log("[RSC Client] Fetching RSC payload for", pageContext.urlPathname);
  const fetchPromise = ReactClient.createFromFetch<RscPayload>(
    fetch("/_rsc", {
      method: "GET",
      headers: {
        // Skip onRenderHtml, but get access to pageContext for RSC render
        // Make Vike think this is a "navigation", skipping onRenderHtml
        "x-vike-urloriginal": `${
          pageContext.urlPathname === "/" ? "" : pageContext.urlPathname
        }/index.pageContext.json${pageContext.urlParsed.searchOriginal || ""}`,
      },
    }),
    { callServer }
  );

  // Store the promise
  window.__navigationPromise = fetchPromise;
  cachePayload(pageContext, await fetchPromise);
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
