import { createElement, useState } from "react";

export default function DualLayout({ children }) {
  const [clicks, setClicks] = useState(0);
  return createElement("div", null, createElement("button", { id: "npm-dual-layout-counter", onClick: () => setClicks(clicks + 1) }, `npm dual layout ${clicks}`), children);
}
