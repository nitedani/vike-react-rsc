"use client";

import { useEffect } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";
import { rerenderPage } from "../../actions/rerenderPage";

let renders = 0;

// testActionStreamedValues(): when each tick arrived, and from which render's ticker
export const Page = () => {
  const { ticker } = usePageContext() as { ticker?: AsyncIterable<number> };
  useEffect(() => {
    if (!ticker) return;
    const render = ++renders;
    const ticks = ((window as { ticks?: { render: number; at: number }[] }).ticks ??= []);
    void (async () => {
      for await (const _ of ticker) ticks.push({ render, at: Date.now() });
    })();
  }, [ticker]);
  return (
    <>
      <h1>Streamed values</h1>
      <button onClick={() => rerenderPage()}>Render again</button>
    </>
  );
};
