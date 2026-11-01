"use client";
import { createElement, useState } from "react";

export function ClientCounter() {
  const [count, setCount] = useState(0);
  return createElement("button", { id: "package-counter", onClick: () => setCount(count + 1) }, `Package counter ${count}`);
}
