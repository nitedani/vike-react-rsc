//@ts-ignore
import ReactServerDOMServerRSC from "react-server-dom-webpack/server.edge";
import { PageShell } from "./PageShell";

const fakeRscServerManifest = {};

export default function renderPageRsc(Page: React.ComponentType) {
  const rscPayloadStream: ReadableStream<Uint8Array> =
    ReactServerDOMServerRSC.renderToReadableStream(
      PageShell(Page),
      fakeRscServerManifest
    );

  return rscPayloadStream;
}
