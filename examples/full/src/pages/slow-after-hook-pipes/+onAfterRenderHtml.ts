import type { PageContextServer } from "vike/types";

// E.g. a transform whose setup fails once it has locked the HTML
export async function onAfterRenderHtml(pageContext: PageContextServer) {
  const stream = pageContext.pageHtmlStream!;
  const readable = stream.readable!.pipeThrough(new TransformStream());
  await Promise.reject(new Error("Thrown by /slow-after-hook-pipes's +onAfterRenderHtml"));
  pageContext.pageHtmlStream = { ...stream, pipe: null, readable };
}
