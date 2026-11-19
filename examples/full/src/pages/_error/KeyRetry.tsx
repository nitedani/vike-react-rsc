"use client";

import { useState } from "react";
import { rerenderPage } from "../../actions/rerenderPage";

// A field that tries again on Enter, with no click, and throws what the retry rejects with
export function KeyRetry() {
  const [error, setError] = useState<unknown>();
  if (error) throw error;
  return (
    <input
      data-key-retry=""
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        rerenderPage().catch(setError);
      }}
    />
  );
}
