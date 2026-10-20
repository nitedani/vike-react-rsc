import type { PageContextServer } from "vike/types";

const marker = new TextEncoder().encode("<!-- Streamed through +onAfterRenderHtml -->");

// E.g. a tool that transforms the page's HTML, and awaits something first
export async function onAfterRenderHtml(pageContext: PageContextServer) {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const stream = pageContext.pageHtmlStream;
  if (!stream) return;
  const readable = stream.readable!.pipeThrough(new TransformStream({ start: (controller) => controller.enqueue(marker) }));
  pageContext.pageHtmlStream = { ...stream, pipe: null, readable };
}
