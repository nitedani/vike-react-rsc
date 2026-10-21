import { createElement, useState } from "react";

export default function Loading() {
  const [dots] = useState("...");
  return createElement("p", { id: "npm-loading" }, `The default file of a loading layout${dots}`);
}
