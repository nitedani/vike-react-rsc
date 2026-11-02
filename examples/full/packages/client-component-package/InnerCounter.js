"use client";
import { createElement, useState } from "react";
// CommonJS, as some of MUI's dependencies
import { isElement } from "react-is";

export function InnerCounter() {
  const [count, setCount] = useState(0);
  const label = createElement("span", null, `Inner counter ${count}`);
  return createElement("button", { id: "inner-counter", onClick: () => setCount(count + 1) }, isElement(label) && label);
}
