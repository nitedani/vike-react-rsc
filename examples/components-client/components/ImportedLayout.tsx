"use client";
import { useState, type ReactNode } from "react";

export default function ImportedLayout({ children }: { children: ReactNode }) {
  const [clicks, setClicks] = useState(0);
  return (
    <div>
      <a href="/imported-layout/server">Server</a>
      <button id="imported-layout-counter" onClick={() => setClicks(clicks + 1)}>
        Imported layout {clicks}
      </button>
      {children}
    </div>
  );
}
