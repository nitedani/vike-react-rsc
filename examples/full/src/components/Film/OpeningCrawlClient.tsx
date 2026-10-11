"use client";

import { useState, type ReactNode } from "react";

// Stays open when "Next film" shows a cached film: rsc() renders it into the same tree
export function OpeningCrawlClient({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? "Hide" : "Show"} the opening crawl</button>
      {isOpen && children}
    </>
  );
}
