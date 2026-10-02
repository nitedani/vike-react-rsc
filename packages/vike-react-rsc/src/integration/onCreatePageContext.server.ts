import type { PageContextServer } from "vike/types";
import { environmentName } from "vike/runtime";
import runtimeRsc from "virtual:runtime/server";
import { tinyassert } from "@hiogawa/utils";

tinyassert(environmentName === "server", "Invalid environment");

// Matched by isClientDisconnect() in runtime/server.tsx
const clientDisconnect = Object.assign(new Error("Client disconnected"), {
  code: "ERR_STREAM_PREMATURE_CLOSE",
});

// https://vike.dev/onCreatePageContext
// Server-only, so that navigation fetches the pageContext, which carries rscPayload.
export function onCreatePageContext(pageContext: PageContextServer): void {
  // Rendered once read: after data(), and never if the pageContext isn't sent.
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  pageContext.rscPayload = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        reader ??= (await runtimeRsc.renderPageRsc(pageContext)).getReader();
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      // Vike stops reading when the client leaves: not a render failure.
      cancel: () => reader?.cancel(clientDisconnect),
    },
    { highWaterMark: 0 }
  );
}
