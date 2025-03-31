import envName from "virtual:enviroment-name";
import { assert } from "../utils/assert";
assert(envName === "client", "Invalid environment");

//@ts-ignore
import ReactClient from "react-server-dom-webpack/client.browser";

// Function to parse an RSC stream into React nodes
export async function parseRscStream(
  stream: ReadableStream<Uint8Array>
): Promise<React.ReactNode> {
  console.log("[RSC Client] Parsing RSC stream...");

  // Create options for RSC stream parsing
  const options = { callServer: fakeCallServer };

  // Parse the RSC stream
  const rootNode = await ReactClient.createFromReadableStream<React.ReactNode>(
    stream,
    options
  );

  console.log("[RSC Client] RSC stream parsed");
  return rootNode;
}

// Function to parse an RSC stream from string
export async function parseRscString(
  content: string
): Promise<React.ReactNode> {
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

// Fake call server function - this would be replaced with real implementation
// for server actions
function fakeCallServer(id: string, args: unknown[]) {
  console.warn(
    "[RSC Client] Server action called but not implemented:",
    id,
    args
  );
  return Promise.reject(new Error("Server actions not implemented"));
}
