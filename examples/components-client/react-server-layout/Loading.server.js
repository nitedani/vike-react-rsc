import { createElement } from "react";

// What the package gives a React server, which the rsc env resolves to
export default function Loading() {
  return createElement("p", { id: "npm-loading" }, "The react-server file of a loading layout");
}
