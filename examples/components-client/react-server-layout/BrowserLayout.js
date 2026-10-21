import { createElement, useState } from "react";

export default function BrowserLayout({ children }) {
  const [clicks, setClicks] = useState(0);
  return createElement("div", null, createElement("button", { id: "npm-browser-layout-counter", onClick: () => setClicks(clicks + 1) }, `npm browser layout ${clicks}`), children);
}
