"use server";

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
  return counterState;
};

// Increment the counter and return the new state without re-rendering
export const incrementCount = async (): Promise<CounterState> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  counterState = {
    count: counterState.count + 1,
    lastUpdated: new Date().toISOString()
  };

  return counterState;
};
