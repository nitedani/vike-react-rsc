import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import type { PageContextServer } from "vike/types";
import type { PagePayload } from "../rsc/runtime";
import type { ClientDeps } from "./clientDeps";

/** Runs `render`, which gets an AbortController to abort once the HTML has rendered, or once nobody will read it. Aborting
 * stops React's HTML render and the copy of the Flight that the HTML reads. Once the client leaves, Vike sends no HTML. */
export async function renderUntilClientLeaves<T>(pageContext: PageContextServer, render: (htmlRender: AbortController) => Promise<T>): Promise<T | undefined> {
  const htmlRender = new AbortController();
  // Vike cancels the HTML once the client leaves, which stops the Flight too, but only after onRenderHtml() has returned
  // the HTML. Until then, we listen to pageContext.abortSignal ourselves.
  const left = pageContext.abortSignal;
  const onLeave = () => cancelRender(pageContext, htmlRender);
  left.addEventListener("abort", onLeave);
  try {
    left.throwIfAborted();
    return await render(htmlRender);
  } catch (error) {
    // Vike gets no HTML, so nothing will read the Flight, nor any HTML stream the hooks left: stop both renders
    cancelRender(pageContext, htmlRender);
    if (!left.aborted) throw error;
    // The client left, so nobody gets the HTML, nor the error that cancelling it caused. Vike sends this instead of a
    // document.
    pageContext.content = "";
  } finally {
    left.removeEventListener("abort", onLeave);
  }
}

// Stops React's HTML render, and the Flight's render. The Flight stops only once both its copies are cancelled: the
// HTML's copy, which htmlRender's signal cuts, and the browser's copy, which Vike reads only after onRenderHtml()
// returns.
function cancelRender(pageContext: PageContextServer, htmlRender: AbortController) {
  htmlRender.abort();
  void pageContext.rscPayload?.cancel();
}

export async function decodeFlight(pageContext: PageContextServer, deps: ClientDeps, signal: AbortSignal): Promise<PagePayload> {
  // The page renders to Flight once: one copy becomes the HTML, Vike inlines the other for hydration
  const [forHtml, forBrowser] = pageContext.rscPayload!.tee();
  pageContext.rscPayload = forBrowser;
  // tee() keeps the render going while either copy is read, so the HTML's copy stops once the HTML is sent, or the
  // client left. The decoder holds its stream's lock, hence a pipe that can be cut.
  const payload = await createFromReadableStream<PagePayload>(forHtml.pipeThrough(new TransformStream(), { signal }));
  // The client components the Flight has sent so far render in the shell, as in vike-react, e.g. a <Config> on a
  // server's first request
  await Promise.allSettled(deps.loads);
  return payload;
}
