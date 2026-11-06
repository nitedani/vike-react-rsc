"use client";

import { useState } from "react";

export function ThrowsOnClick() {
  const [failed, setFailed] = useState(false);
  if (failed) throw new Error("A component failed in the browser on a click");
  return <button onClick={() => setFailed(true)}>Fail now</button>;
}
