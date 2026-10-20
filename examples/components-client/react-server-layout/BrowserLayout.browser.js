import { createElement, useState } from "react";

// What the package gives a browser, which reads window as it loads
window.npmBrowserLayoutFile = "BrowserLayout.browser.js";

export default function BrowserLayout({ children }) {
  const [clicks, setClicks] = useState(0);
  return createElement("div", null, createElement("button", { id: "npm-browser-layout-counter", onClick: () => setClicks(clicks + 1) }, `npm browser layout ${clicks}`), children);
}
