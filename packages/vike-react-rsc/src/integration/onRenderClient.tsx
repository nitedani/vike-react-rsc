import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "client", "Invalid environment");

import { useEffect, useState } from "react";
import ReactDOMClient from "react-dom/client";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import envName from "virtual:enviroment-name";
import { PageContextProvider } from "../hooks/pageContext/pageContext-client";
import { parseRscStream } from "../runtime/client";
import type { RscPayload } from "../types";
import { getGlobalClientState } from "../runtime/client/globalState";

// Initialize the global client state
const globalState = getGlobalClientState();

// The Root component which manages RSC nodes
function Root({
  initialPayload,
  initialPageContext,
}: {
  initialPayload: RscPayload;
  initialPageContext: PageContextClient;
}) {
  const [payload, setPayload] = useState<{
    payload: RscPayload;
    pageContext: PageContextClient;
  }>({ payload: initialPayload, pageContext: initialPageContext });

  useEffect(() => {
    // Store the setPayload function in the global state
    globalState.setPayload = setPayload;
  }, []);

  return (
    <PageContextProvider pageContext={payload.pageContext}>
      {payload.payload.root}
    </PageContextProvider>
  );
}

export const onRenderClient: OnRenderClientAsync = async function (
  pageContext: PageContextClient
) {
  // Store the page context in the global state
  globalState.pageContext = pageContext;
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
        <Root
          initialPayload={initialPayload}
          initialPageContext={pageContext}
        />,
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
      console.log("[Client] Client-side navigation", globalState.navigationPromise);
      if (globalState.navigationPromise) {
        const payload = await globalState.navigationPromise;
        globalState.setPayload?.({ pageContext, payload });
      } else {
        console.error("[Client] No navigation promise found");
      }
      console.log("[Client] Navigation complete");
    } catch (error) {
      console.error("[Client] Failed to navigate:", error);
    }
  }
};
