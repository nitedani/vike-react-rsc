"use client";

import { useEffect, useState } from "react";

export default function TextClient({ text }: { text: string }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <p data-text>
      {hydrated ? "Hydrated" : "Server"}: {text}
    </p>
  );
}
