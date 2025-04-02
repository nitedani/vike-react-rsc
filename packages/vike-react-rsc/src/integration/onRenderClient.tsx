import React, { use } from "react";
import ReactDOMClient from "react-dom/client";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import { parseRscStream, parseRscString } from "../runtime/client";
import { Shell } from "./shell";
import envName from "virtual:enviroment-name"
import { assert } from "../utils/assert";
assert(envName === "client", "Invalid environment")

declare global {
  interface Window {
    setPromise: React.Dispatch<React.SetStateAction<Promise<React.ReactNode>>>
  }
}
// The Root component which manages RSC nodes
function Root({
  initialNodePromise,
}: {
  initialNodePromise: Promise<React.ReactNode>;
}) {
  const [promise, setPromise] =
    React.useState<Promise<React.ReactNode>>(initialNodePromise);
  const node = use(promise);

  // Store the state setter for navigation updates
  React.useEffect(() => {
    window.setPromise = setPromise;
  }, []);

  return node;
}

export const onRenderClient: OnRenderClientAsync = async function (
  pageContext: PageContextClient
) {
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
      const initialNodePromise = parseRscStream(rscPayloadStream);

      // Hydrate the root with our component
      ReactDOMClient.hydrateRoot(
        container,
        <Shell>
          <Root initialNodePromise={initialNodePromise} />
        </Shell>
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
      const nodes = parseRscString(rscPayloadString);
      window.setPromise(nodes);

      console.log("[Client] Navigation complete");
    } catch (error) {
      console.error("[Client] Failed to navigate:", error);
    }
  }
};
