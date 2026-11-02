"use client";

import { useEffect, useState } from "react";
import { useAsync } from "react-streaming";

// The browser reuses the answer the HTML carries, so it never asks again
export function Answer() {
  const answer = useAsync(["use-async"], async () => (typeof window === "undefined" ? "Answered on the server" : "Answered again in the browser"));
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <p data-answer>
      {hydrated ? "Hydrated" : "Server"}: {answer}
    </p>
  );
}
