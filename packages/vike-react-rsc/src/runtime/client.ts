import { tinyassert } from "@hiogawa/utils";
import envName from "virtual:enviroment-name";
tinyassert(envName === "client", "Invalid environment");

//@ts-ignore
import ReactClient from "react-server-dom-webpack/client.browser";
import type { RscPayload } from "../types";

export async function callServer(
  id: string,
  args: unknown[]
): Promise<RscPayload> {
  console.log("[RSC Client] Calling server action:", id);

  // Parse the RSC payload from the response
  const result = await ReactClient.createFromFetch<RscPayload>(
    fetch("/_server-action", {
      method: "POST",
      headers: {
        "x-rsc-action": id,
        "x-vike-page-id": window.__pageId,
      },
      body: await ReactClient.encodeReply(args),
    }),
    { callServer }
  );
  window.__setPayloadOrPromise(result);
  return result;
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

// Function to parse an RSC stream from string
export async function parseRscString(content: string): Promise<RscPayload> {
  if (!content) {
    throw new Error("[RSC Client] Cannot parse empty RSC content");
  }

  // Create a stream from the string
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });

  return parseRscStream(stream);
}
