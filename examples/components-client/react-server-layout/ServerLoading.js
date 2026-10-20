"use server component";
import { createElement } from "react";

export default async function ServerLoading() {
  return createElement("p", { id: "npm-server-loading" }, "The default file of a server loading layout");
}
