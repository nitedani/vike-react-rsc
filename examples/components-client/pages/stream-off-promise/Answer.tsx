"use client";
import { Suspense, use, useState } from "react";

// Reads the promise only once clicked, so the HTML doesn't wait for it
export function Answer({ answer }: { answer: Promise<string> }) {
  const [shown, setShown] = useState(false);
  if (!shown) return <button onClick={() => setShown(true)}>Show the answer</button>;
  return (
    <Suspense fallback={<p>Waiting for the answer</p>}>
      <Text text={answer} />
    </Suspense>
  );
}

function Text({ text }: { text: Promise<string> }) {
  return <p id="answer">{use(text)}</p>;
}
