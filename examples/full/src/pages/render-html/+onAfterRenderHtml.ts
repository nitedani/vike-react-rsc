import type { PageContextServer } from "vike/types";

const marker = new TextEncoder().encode("<!-- Streamed through +onAfterRenderHtml -->");

// E.g. a tool that transforms the page's HTML stream, pre-rendered too
export function onAfterRenderHtml(pageContext: PageContextServer) {
  const stream = pageContext.pageHtmlStream!;
  const readable = stream.readable!.pipeThrough(new TransformStream({ start: (controller) => controller.enqueue(marker) }));
  pageContext.pageHtmlStream = { ...stream, pipe: null, readable };
}
