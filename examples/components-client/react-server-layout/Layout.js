import { createElement, useState } from "react";

export default function Layout({ children }) {
  const [clicks, setClicks] = useState(0);
  return createElement("div", null, createElement("button", { id: "npm-layout-counter", onClick: () => setClicks(clicks + 1) }, `npm layout ${clicks}`), children);
}
