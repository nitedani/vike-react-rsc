"use client";

import { useState } from "react";
import { saveThenFailData, saveThenGuard404, slowSave } from "../../actions/edgeCases";

export default function ActionsClient() {
  const [result, setResult] = useState("");
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
      <p data-result="">{result}</p>
    </>
  );
}
