import { createElement } from "react";

// What the package gives a React server, which the rsc env resolves to
export default function Layout({ children }) {
  return createElement("div", null, createElement("p", null, "The react-server layout"), children);
}
