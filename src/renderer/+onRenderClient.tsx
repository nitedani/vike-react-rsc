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

export async function onRenderClient(pageContext: PageContextClient) {
  console.log("[Vike Hook] +onRenderClient called.");
  try {
    console.log("[Client] hydrateApp() called.");
    const container = document.getElementById("root");
    if (!container) {
      console.error("[Client] Container #root not found!");
      return;
    }

    // Access the stream initialized by the injected script
    const rscPayloadStream = (window as any)
      .__rsc_payload_stream as ReadableStream<Uint8Array>;
    if (!rscPayloadStream) {
      console.error("[Client] RSC Payload Stream not found. Hydration failed.");
      container.innerHTML = "Error: RSC payload stream missing on client.";
      return;
    }
    console.log(
      "[Client] RSC Payload Stream found, consuming for hydration..."
    );

    // Consume stream to get React nodes
    const rootNode =
      await ReactServerDOMClient.createFromReadableStream<React.ReactNode>(
        rscPayloadStream,
        { callServer: fakeCallServer }
      );

    console.log("[Client] Hydrating root...");
    ReactDOMClient.hydrateRoot(container, rootNode);
    console.log("[Client] Hydration complete.");
  } catch (err) {
    console.error("[Client Hook] Hydration failed:", err);
  }
}
