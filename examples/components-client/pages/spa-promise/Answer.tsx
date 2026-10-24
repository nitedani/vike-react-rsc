"use client";
import { Suspense, use } from "react";
import { ask } from "./ask";

export function Answer({ answer }: { answer: Promise<string> }) {
  return (
    <>
      <button type="button" onClick={() => ask()}>
        Ask
      </button>
      <Suspense fallback={<p>Waiting for the answer</p>}>
        <Text text={answer} />
      </Suspense>
    </>
  );
}

function Text({ text }: { text: Promise<string> }) {
  return <p id="answer">{use(text)}</p>;
}
