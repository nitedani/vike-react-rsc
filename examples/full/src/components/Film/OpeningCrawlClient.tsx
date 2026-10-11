"use client";

import { useState, type ReactNode } from "react";

// Stays open on "Next film": rsc() keeps its output mounted when its props change
export function OpeningCrawlClient({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? "Hide" : "Show"} the opening crawl</button>
      {isOpen && children}
    </>
  );
}
