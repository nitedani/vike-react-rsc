"use client";

import { useState, useTransition } from "react";
import { incrementCount, getCount } from "../../actions/counter";
import { counterStyles } from "./styles";

interface CounterClientProps {
  initialCount: number;
}

export default function CounterClient({ initialCount }: CounterClientProps) {
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  // Increment without re-rendering the page
  const handleIncrement = () => {
    startTransition(async () => {
      // Call the server action to increment the count
      const counterState = await incrementCount();
      setCount(counterState.count);
    });
  };

  // Refresh without re-rendering the page
  const handleRefresh = () => {
    startTransition(async () => {
      // Get the latest count from the server without incrementing
      const counterState = await getCount();
      setCount(counterState.count);
    });
  };

  return (
    <>
      <div css={counterStyles.displayContainer}>
        <div css={[
          counterStyles.number,
          isPending && counterStyles.numberPending
        ]}>
          {count}
        </div>
      </div>

      <button
        onClick={() => {
          if (!isPending) {
            handleIncrement();
          }
        }}
        css={counterStyles.incrementButton}
      >
        Increment
      </button>

      <div css={counterStyles.refreshContainer}>
        <button
          onClick={() => {
            if (!isPending) {
              handleRefresh();
            }
          }}
          css={counterStyles.refreshButton}
          title="Refresh counter"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
    </>
  );
}
