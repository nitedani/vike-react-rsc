import { useState, type ReactNode } from "react";

export default function VikeReactLayout({ children }: { children: ReactNode }) {
  const [clicks, setClicks] = useState(0);
  return (
    <div>
      <button id="vike-react-layout-counter" onClick={() => setClicks(clicks + 1)}>
        vike-react layout {clicks}
      </button>
      {children}
    </div>
  );
}
