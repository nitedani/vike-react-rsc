import type { PageContextServer } from "vike/types";
import { getRscEnvironment } from "../runtime/ssr";

// Matched by isClientDisconnect() in runtime/server.tsx
const clientDisconnect = Object.assign(new Error("Client disconnected"), {
  code: "ERR_STREAM_PREMATURE_CLOSE",
});

// https://vike.dev/onCreatePageContext
// Server-only, so that navigation fetches the pageContext, which carries rscPayload.
export async function onCreatePageContext(pageContext: PageContextServer): Promise<void> {
  const rsc = getRscEnvironment(pageContext);
  // Rendered once read: after data(), and never if the pageContext isn't sent.
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  pageContext.rscPayload = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        reader ??= (await rsc.config.renderRsc(rsc.pageContext)).getReader();
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      // Vike stops reading when the client leaves: not a render failure.
      cancel: () => reader?.cancel(clientDisconnect),
    },
    { highWaterMark: 0 }
  );

  // A server action runs before guard() and data(), once: not again for the page a `throw render()` or an error shows instead.
  const { rscAction } = pageContext;
  if (!rscAction) return;
  if (!rscAction.hasRun) {
    rscAction.hasRun = true;
    Object.assign(rscAction, await rsc.config.runServerAction(rsc.pageContext));
    if (!rscAction.rerender) rscAction.renderReturnValue = () => rsc.config.renderRsc(rsc.pageContext);
  }
  // Hooks see the cookies the action set, e.g. guard() after a login, also on the page a `throw render()` shows
  pageContext.headers = withCookies(pageContext.headers, rscAction.responseHeaders);
}

function withCookies(headers: Record<string, string> | null, responseHeaders: Headers): Record<string, string> | null {
  const setCookies = responseHeaders.getSetCookie();
  if (setCookies.length === 0) return headers;
  const cookies = new Map<string, string>();
  for (const cookie of [...(headers?.cookie?.split(/;\s*/) ?? []), ...setCookies.map((c) => c.split(";")[0])]) {
    if (cookie) cookies.set(cookie.split("=")[0], cookie);
  }
  return { ...headers, cookie: [...cookies.values()].join("; ") };
}
