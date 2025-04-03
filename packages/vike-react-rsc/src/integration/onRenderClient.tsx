import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "client", "Invalid environment");

import { startTransition, use, useEffect, useState } from "react";
import ReactDOMClient from "react-dom/client";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import envName from "virtual:enviroment-name";
import { callServer, parseRscStream, parseRscString } from "../runtime/client";
import type { RscPayload } from "../types";
import { Shell } from "./shell";

declare global {
  interface Window {
    // Promise = show fallback
    __setPayloadOrPromise: React.Dispatch<
      React.SetStateAction<Promise<RscPayload> | RscPayload>
    >;
    __vikeRscCallServer: typeof callServer;
    __pageId: string;
  }
}
window.__vikeRscCallServer = callServer;

// The Root component which manages RSC nodes
function Root({ initialPayload }: { initialPayload: RscPayload }) {
  const [payloadOrPromise, setPayloadOrPromise] = useState<
    Promise<RscPayload> | RscPayload
  >(initialPayload);

  const node =
    payloadOrPromise instanceof Promise
      ? use(payloadOrPromise)
      : payloadOrPromise;

  // Store the state setter for navigation updates
  useEffect(() => {
    window.__setPayloadOrPromise = setPayloadOrPromise;
  }, []);

  return node.root;
}

export const onRenderClient: OnRenderClientAsync = async function (
  pageContext: PageContextClient
) {
  window.__pageId = pageContext.pageId!;
  console.log("[Vike Hook] +onRenderClient called");

  // Handle initial page load (hydration)
  if (pageContext.isHydration) {
    try {
      console.log("[Client] Hydrating root");
      const container = document.getElementById("root");
      if (!container) {
        console.error("[Client] Container #root not found!");
        return;
      }

      // Get the RSC payload stream that was injected by the server
      const rscPayloadStream = (window as any)
        .__rsc_payload_stream as ReadableStream<Uint8Array>;
      const initialPayload = await parseRscStream(rscPayloadStream);

      // Hydrate the root with our component
      ReactDOMClient.hydrateRoot(
        container,
        <Shell>
          <Root initialPayload={initialPayload} />
        </Shell>,
        {
          formState: initialPayload.formState,
        }
      );

      console.log("[Client] Hydration complete");
    } catch (err) {
      console.error("[Client] Hydration failed:", err);
    }
  }
  // Handle client-side navigation
  else if (pageContext.isClientSideNavigation) {
    try {
      console.log("[Client] Client-side navigation");

      // Get the RSC payload string that was passed through pageContext
      const { rscPayloadString } = pageContext;
      if (!rscPayloadString) {
        console.error("[Client] No RSC payload string found for navigation");
        return;
      }

      // Parse the RSC payload string and update the React tree
      const payload = parseRscString(rscPayloadString);
      window.__setPayloadOrPromise(payload);

      console.log("[Client] Navigation complete");
    } catch (error) {
      console.error("[Client] Failed to navigate:", error);
    }
  }
};
