"use client";

import { useEffect } from "react";
import { usePageContext } from "vike-react-rsc/pageContext";
import { rerenderPage } from "../../actions/rerenderPage";

// In dev, StrictMode runs an effect twice on mount: one loop per ticker
const tickers: AsyncIterable<number>[] = [];

// testActionStreamedValues(): when each tick arrived, and from which ticker, in the order they came
export const Page = () => {
  const { ticker } = usePageContext() as { ticker?: AsyncIterable<number> };
  useEffect(() => {
    if (!ticker || tickers.includes(ticker)) return;
    const render = tickers.push(ticker);
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
