"use client";

import { useActionState, useState } from "react";
import { rsc } from "vike-react-rsc/client";
import { countSubmit, FailingComponent, redirectToScript, saveThenFailData, saveThenGuard404, slowSave } from "../../actions/edgeCases";

const FailingComponentRsc = rsc(FailingComponent);

export default function ActionsClient() {
  const [result, setResult] = useState("");
  const [showFailing, setShowFailing] = useState(false);
  const [submits, countSubmitAction] = useActionState(countSubmit, 0);
  const call = (action: () => Promise<string>) => async () => {
    let message: string;
    try {
      message = `Returned: ${await action()}`;
    } catch (error) {
      message = `Rejected: ${(error as Error).message}`;
    }
    // Also logged: the caller may have navigated away before the action returned
    console.log(message);
    setResult(message);
  };
  return (
    <>
      <button onClick={call(saveThenFailData)}>Save, then data() throws</button>
      <button onClick={call(saveThenGuard404)}>Save, then guard() throws render(404)</button>
      <button onClick={call(slowSave)}>Slow save</button>
      <button onClick={call(redirectToScript)}>Redirect to a javascript: URL</button>
      <p data-result="">{result}</p>
      <button onClick={() => setShowFailing(true)}>Load a failing server component</button>
      {showFailing && <FailingComponentRsc fallback={<p data-rsc-fallback="">Not loaded</p>} />}
      <form action={countSubmitAction}>
        <button type="submit">Count a submit</button>
      </form>
      <p data-submits="">Submitted {submits} times</p>
    </>
  );
}
