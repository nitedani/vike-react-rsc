//@ts-ignore
import ReactServerDOMServerRSC from "react-server-dom-webpack/server.edge";
import { getPageShell } from "./getPageShell";

const fakeRscServerManifest = {};

export default function renderPageRsc(Page: React.ComponentType) {
  const element = getPageShell(Page);
  const rscPayloadStream: ReadableStream<Uint8Array> =
    ReactServerDOMServerRSC.renderToReadableStream(
      element,
      fakeRscServerManifest
    );

  return rscPayloadStream;
}
