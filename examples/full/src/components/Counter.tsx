"use client";

import { usePageContext } from "vike-react-rsc/pageContext";
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  const ctx = usePageContext();
  console.log(ctx.pageId);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
