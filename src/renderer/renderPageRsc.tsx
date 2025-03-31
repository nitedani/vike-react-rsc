import { renderToRscStream } from "../runtime/server";
import React from "react";
import { getPageShell } from "./getPageShell";

export default function renderPageRsc(Page: React.ComponentType) {
  console.log(
    "[Renderer] Rendering page to RSC stream:",
    Page.name || "UnnamedPage"
  );

  // Get the page shell with the Page component
  const element = getPageShell(Page);

  // Render to an RSC payload stream
  const rscPayloadStream = renderToRscStream(element);

  return rscPayloadStream;
}
