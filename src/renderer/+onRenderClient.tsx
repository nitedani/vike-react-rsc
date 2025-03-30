console.log("[Client] client.tsx loaded.");

import type { PageContextClient } from "vike/types";
import React from "react";
import ReactDOMClient from "react-dom/client";
//@ts-ignore
import ReactServerDOMClient from "react-server-dom-webpack/client.browser";

const fakeCallServer = (id: string, args: unknown[]) => {
  console.error("callServer shim called, Server Actions not implemented", {
    id,
    args,
  });
  return Promise.reject(new Error("callServer not implemented"));
};

let setRscNodes_: React.Dispatch<React.SetStateAction<React.ReactNode>>;
function Root({ initialNodes }: { initialNodes: React.ReactNode }) {
  const [rscNodes, setRscNodes] = React.useState<React.ReactNode>(initialNodes);
  setRscNodes_ = setRscNodes;
  return rscNodes;
}

async function parseRscStream(
  stream: ReadableStream<Uint8Array>
): Promise<React.ReactNode> {
  console.log(`[Client] Parsing RSC stream...`);
  const rootNode =
    await ReactServerDOMClient.createFromReadableStream<React.ReactNode>(
      stream,
      { callServer: fakeCallServer }
    );
  console.log(`[Client] RSC stream parsed.`);
  return rootNode;
}

export async function onRenderClient(pageContext: PageContextClient) {
  console.log("[Vike Hook] +onRenderClient called.");

  if (pageContext.isHydration)
    try {
      console.log("[Client] Hydrating root...");
      const container = document.getElementById("root");
      if (!container) {
        console.error("[Client] Container #root not found!");
        return;
      }
      const rscPayloadStream = (window as any)
        .__rsc_payload_stream as ReadableStream<Uint8Array>;
      const initialNodes = await parseRscStream(rscPayloadStream);
      ReactDOMClient.hydrateRoot(
        container,
        <Root initialNodes={initialNodes} />
      );
      console.log("[Client] Hydration complete.");
    } catch (err) {
      console.error("[Client Hook] Hydration failed:", err);
    }
  else if (pageContext.isClientSideNavigation)
    try {
      {
        console.log("[Client] navigating to URL...");
        const { rscPayloadString } = pageContext;
        const nodes = await parseRscStream(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(rscPayloadString!));
              controller.close();
            },
          })
        );
        setRscNodes_(nodes);
        console.log("[Client] Navigation complete.");
      }
    } catch (error) {
      console.error("[Client] Failed to fetch RSC payload:", error);
    }
}
