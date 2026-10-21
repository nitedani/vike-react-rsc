import { createElement } from "react";

// What the package gives a React server
export default async function ServerLoading() {
  return createElement("p", { id: "npm-server-loading" }, "The react-server file of a server loading layout");
}
