import { createElement } from "react";

// What the package gives a React server
export default async function ServerLayout({ children }) {
  return createElement("div", null, createElement("p", { id: "npm-server-layout" }, "The react-server file of a server layout"), children);
}
