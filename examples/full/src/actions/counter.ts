"use server";

import { rerender } from "vike-react-rsc/server";

interface CounterState {
  count: number;
  lastUpdated: string;
}

// Shared counter state that persists across all users
let counterState: CounterState = {
  count: 0,
  lastUpdated: new Date().toISOString()
};

// Get the current counter state
export const getCount = async (): Promise<CounterState> => {
  console.log("Getting counter state without re-rendering");
  return counterState;
};

// Get the current counter state and trigger a re-render
export const getCountWithRerender = async (): Promise<CounterState> => {
  console.log("Getting counter state with re-rendering");
  // Call rerender to update the UI
  rerender();
  return counterState;
};

// Increment the counter and return the new state without re-rendering
export const incrementCount = async (): Promise<CounterState> => {
  console.log("Incrementing global counter without re-rendering");

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Increment the counter and update timestamp
  counterState = {
    count: counterState.count + 1,
    lastUpdated: new Date().toISOString()
  };

  return counterState;
};

// Increment the counter, trigger a re-render, and return the new state
export const incrementCountWithRerender = async (): Promise<CounterState> => {
  console.log("Incrementing global counter with re-rendering");

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Increment the counter and update timestamp
  counterState = {
    count: counterState.count + 1,
    lastUpdated: new Date().toISOString()
  };

  // Call rerender to update the UI
  rerender();

  return counterState;
};
