import { useEffect, useState } from "react";

// In dev, <StrictMode> runs an effect twice as the component mounts
export function EffectRuns() {
  const [runs, setRuns] = useState(0);
  useEffect(() => setRuns((runs) => runs + 1), []);
  return <p id="effect-runs">Effect runs: {runs}</p>;
}
