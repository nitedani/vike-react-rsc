"use client";

import { useEffect, useState } from "react";
import { rerenderPage } from "../../actions/rerenderPage";

// Once shown, it throws what its rerenderPage() call rejects with, as a component showing a server function's result does while the server fails
export function ThrowsOnceShown() {
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    rerenderPage().catch(setError);
  }, []);
  if (error) throw error;
  return null;
}
