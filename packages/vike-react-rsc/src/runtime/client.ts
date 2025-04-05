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
  window.__setPayload((current) => ({
    pageContext: current.pageContext,
    payload: result,
  }));
  return result.returnValue;
}

export function onNavigate(): Promise<RscPayload> {
  console.log("[RSC Client] Navigation:", window.location.href);
  return ReactClient.createFromFetch<RscPayload>(
    fetch("/_rsc", {
      method: "GET",
      headers: {
        // Skip onRenderHtml, but get access to pageContext for RSC render
        // Make Vike think this is a "navigation", skipping onRenderHtml
        "x-vike-urloriginal": `${
          window.location.pathname === "/" ? "" : window.location.pathname
        }/index.pageContext.json${window.location.search}`,
      },
    }),
    { callServer }
  );
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
