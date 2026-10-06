"use client";

import { useEffect, useState } from "react";

export default function CspClient() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return <p data-csp>{hydrated ? "Hydrated" : "Server"}</p>;
}
