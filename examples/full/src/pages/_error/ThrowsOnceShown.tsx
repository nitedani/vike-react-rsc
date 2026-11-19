"use client";

import { useEffect, useState } from "react";

// It throws in the render its effect starts, once the navigation that showed the error page ended
export function ThrowsOnceShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  if (shown) throw new Error("The error page failed in the browser on demand");
  return null;
}
