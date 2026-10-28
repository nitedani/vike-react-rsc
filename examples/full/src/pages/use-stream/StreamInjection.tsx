"use client";

import { useStream } from "react-streaming";

// As vike-react-query's and vike-react-apollo's components: on the server, they pass their data in the HTML stream
export function StreamInjection() {
  useStream()?.injectToStream("<!-- Injected by useStream() -->");
  return null;
}
