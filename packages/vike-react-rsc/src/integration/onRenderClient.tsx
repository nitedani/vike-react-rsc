import { tinyassert } from "@hiogawa/utils";
tinyassert(envName === "client", "Invalid environment");

import { use, useEffect, useState } from "react";
import ReactDOMClient from "react-dom/client";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
import envName from "virtual:enviroment-name";
import { callServer, parseRscStream, parseRscString } from "../runtime/client";
import type { RscPayload } from "../types";
import { PageContextProvider } from "../hooks/usePageContext/usePageContext-client";

declare global {
  interface Window {
    // Promise = show fallback
    __setPayload: React.Dispatch<
      React.SetStateAction<{
        payload: RscPayload;
        pageContext: PageContextClient;
      }>
    >;
    __vikeRscCallServer: typeof callServer;
    __pageId: string;
  }
}
window.__vikeRscCallServer = callServer;

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
    window.__setPayload = setPayload;
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
      console.log("[Client] Client-side navigation");

      // Get the RSC payload string that was passed through pageContext
      const { rscPayloadString } = pageContext;
      if (!rscPayloadString) {
        console.error("[Client] No RSC payload string found for navigation");
        return;
      }

      // Parse the RSC payload string and update the React tree
      const payload = await parseRscString(rscPayloadString);
      window.__setPayload({ pageContext, payload });

      console.log("[Client] Navigation complete");
    } catch (error) {
      console.error("[Client] Failed to navigate:", error);
    }
  }
};
