import { useState, type ReactNode } from "react";

export default function AliasedLayout({ children }: { children: ReactNode }) {
  const [clicks, setClicks] = useState(0);
  return (
    <div>
      <button id="aliased-layout-counter" onClick={() => setClicks(clicks + 1)}>
        Aliased layout {clicks}
      </button>
      {children}
    </div>
  );
}
