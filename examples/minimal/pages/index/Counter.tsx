"use client";
// Imports nothing from react, so the browser gets React only through what vike-react-rsc pre-bundles
import { rsc } from "vike-react-rsc/client";
import { Details, sayHello } from "./actions";

const DetailsRsc = rsc(Details);
let count = 0;

export function Counter() {
  return (
    <>
      <button id="counter" onClick={(event) => (event.currentTarget.textContent = `Counter ${++count}`)}>
        Counter 0
      </button>
      <button id="action" onClick={async () => (document.getElementById("hello")!.textContent = await sayHello())}>
        Run the action
      </button>
      <p id="hello" />
      <DetailsRsc fallback={<p>Loading</p>} />
    </>
  );
}
