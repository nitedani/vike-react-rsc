import type { PageContextServer } from "vike/types";
import { getRsc } from "../ssr/bridge";
import { CLIENT_DISCONNECT } from "../protocol";

const clientDisconnect = Object.assign(new Error("Client disconnected"), { code: CLIENT_DISCONNECT });

// https://vike.dev/onCreatePageContext
// Server-only, so that navigation fetches the pageContext, which carries rscPayload.
export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  const rsc = getRsc(pageContext);
  // Rendered once read: after data(), and never if the pageContext isn't sent.
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  pageContext.rscPayload = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        reader ??= (await rsc.runtime.render(rsc.pageContext)).getReader();
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      // Vike stops reading when the client leaves: not a render failure.
      cancel: () => reader?.cancel(clientDisconnect),
    },
    { highWaterMark: 0 }
  );

  const call = pageContext.rscAction;
  if (!call) return;
  await call.run(pageContext);
  pageContext.headers = call.withCookies(pageContext.headers);
}
