"use client";

import { useState } from "react";
import { rsc } from "vike-react-rsc/client";
import { getCount } from "../../actions/counter";
import { LoadCount } from "./LoadCount";

// No `fallback` prop: rsc() shows Loading.component
const LoadCountRsc = rsc(LoadCount);

// Two instances of one rsc() component share one request and one cache entry. Any other server action marks the cache
// stale.
export function LoadCountClient() {
  const [shown, setShown] = useState(false);
  const [ranAction, setRanAction] = useState(false);
  return (
    <div>
      <button onClick={() => setShown(!shown)}>{shown ? "Hide" : "Show"} server counts</button>
      <button onClick={() => getCount().then(() => setRanAction(true))}>Run a server action</button>
      {ranAction && <span data-ran-action="">The server action ran</span>}
      {shown && (
        <>
          <LoadCountRsc />
          <LoadCountRsc />
        </>
      )}
    </div>
  );
}
