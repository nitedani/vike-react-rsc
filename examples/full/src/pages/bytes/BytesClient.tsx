"use client";

import { useEffect, useState } from "react";

export default function BytesClient({ bytes }: { bytes: Uint8Array }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <p data-bytes>
      {hydrated ? "Hydrated" : "Server"} bytes: {Array.from(bytes).join(",")}
    </p>
  );
}
