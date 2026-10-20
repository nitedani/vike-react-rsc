import { useState } from "react";

export function ConfigLoading() {
  // Only a client component can call it
  const [dots] = useState("...");
  return <p id="config-loading">Loading the page{dots}</p>;
}
