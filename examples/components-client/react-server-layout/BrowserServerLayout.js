"use server component";
import "server-only";
import { createElement } from "react";

export default async function BrowserServerLayout({ children }) {
  return createElement("div", null, createElement("p", { id: "npm-browser-server-layout" }, "The default file of a server layout with a browser file"), children);
}
