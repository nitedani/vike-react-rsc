"use server component";
import { createElement } from "react";

export default async function ServerLayout({ children }) {
  return createElement("div", null, createElement("p", { id: "npm-server-layout" }, "The default file of a server layout"), children);
}
