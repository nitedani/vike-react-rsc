"use client";
import { useState } from "react";
import { rsc } from "vike-react-rsc/client";
import { Details, sayHello } from "./actions";

const DetailsRsc = rsc(Details);

export function Counter() {
  const [count, setCount] = useState(0);
  const [hello, setHello] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  return (
    <>
      <button id="counter" onClick={() => setCount(count + 1)}>
        Counter {count}
      </button>
      <button id="action" onClick={async () => setHello(await sayHello())}>
        Run the action
      </button>
      <p id="hello">{hello}</p>
      <button id="load" onClick={() => setShowDetails(true)}>
        Load the details
      </button>
      {showDetails && <DetailsRsc fallback={<p>Loading</p>} />}
    </>
  );
}
