// "use client";

// import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  // const [state, setState] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
      }}
    >
      <div>
        <div>
          <a href="/">Home</a>
        </div>
        <div>
          <a href="/todos">Todos</a>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
