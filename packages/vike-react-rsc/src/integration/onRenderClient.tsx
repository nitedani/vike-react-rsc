import { tinyassert } from "@hiogawa/utils";
import environmentName from "virtual:environment-name";
tinyassert(environmentName === "client", "Invalid environment");

import { useEffect, useState } from "react";
import ReactDOMClient from "react-dom/client";
import type { OnRenderClientAsync, PageContextClient } from "vike/types";
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

  // Handle initial page load (hydration)
  if (pageContext.isHydration) {
    try {
      const container = document.getElementById("root");
      if (!container) {
        console.error("[Client] Container #root not found!");
        return;
      }

      tinyassert(pageContext.rscPayload);
      const initialPayload = await parseRscStream(pageContext.rscPayload);

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

    } catch (err) {
      console.error("[Client] Hydration failed:", err);
    }
  }
  // Handle client-side navigation
  else if (pageContext.isClientSideNavigation) {
    try {
      tinyassert(pageContext.rscPayload);
      const payload = await parseRscStream(pageContext.rscPayload);
      globalState.setPayload?.({ pageContext, payload });
    } catch (error) {
      console.error("[Client] Failed to navigate:", error);
    }
  }
};
