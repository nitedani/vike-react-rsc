import type { PageContextServer } from "vike/types";

// E.g. a tool written for vike-react's Node.js stream
export function onAfterRenderHtml(pageContext: PageContextServer) {
  const stream = pageContext.pageHtmlStream!;
  if (stream.readable || !stream.pipe) throw new Error("+onAfterRenderHtml didn't get a Node.js stream");
  stream.injectToStream("<!-- A Node.js stream -->");
}
