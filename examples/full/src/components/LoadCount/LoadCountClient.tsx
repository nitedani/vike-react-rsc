"use client";

import { useState } from "react";
import { rsc } from "vike-react-rsc/client";
import { getCount } from "../../actions/counter";
import { LoadCount, NamedLoadCount } from "./LoadCount";

// No `fallback` prop: rsc() shows Loading.component
const LoadCountRsc = rsc(LoadCount);
const NamedLoadCountRsc = rsc(NamedLoadCount);

// Two instances of one rsc() component share one request and one cache entry. Any other server action loads it again.
export function LoadCountClient() {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <button onClick={() => setShown(!shown)}>{shown ? "Hide" : "Show"} server counts</button>
      <RunServerAction />
      <NamedLoadCounts />
      <PagedLoadCount />
      {shown && (
        <>
          <LoadCountRsc />
          <LoadCountRsc />
        </>
      )}
    </div>
  );
}

// Renders apart from the rsc() components, so the action alone reloads the ones on screen
function RunServerAction() {
  const [ranAction, setRanAction] = useState(false);
  return (
    <>
      <button onClick={() => getCount().then(() => setRanAction(true))}>Run a server action</button>
      {ranAction && <span data-ran-action="">The server action ran</span>}
    </>
  );
}

// Two rsc() components that each switch between the names X and Y, so one shows the output the other loaded
function NamedLoadCounts() {
  const [shown, setShown] = useState(false);
  if (!shown) return <button onClick={() => setShown(true)}>Show named counts</button>;
  return (
    <>
      <NamedLoadCountSwitch names={["X", "Y"]} />
      <NamedLoadCountSwitch names={["Y", "X"]} />
    </>
  );
}

function NamedLoadCountSwitch({ names }: { names: [string, string] }) {
  const [index, setIndex] = useState(0);
  return (
    <div>
      <NamedLoadCountRsc name={names[index]} />
      <button data-switch={names[0]} onClick={() => setIndex(1 - index)}>
        Switch the name
      </button>
    </div>
  );
}

function PagedLoadCount() {
  const [index, setIndex] = useState<number>();
  // What the input holds while it's edited, e.g. nothing: the page shown changes only for a number
  const [text, setText] = useState("0");
  if (index === undefined) return <button onClick={() => setIndex(0)}>Page through named counts</button>;
  return (
    <div>
      <label>
        Page index{" "}
        <input
          type="number"
          value={text}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            if (value !== "") setIndex(Number(value));
          }}
        />
      </label>
      <NamedLoadCountRsc name={`Page ${index}`} />
    </div>
  );
}
