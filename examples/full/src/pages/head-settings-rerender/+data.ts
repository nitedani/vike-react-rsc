import { getCounts } from "../../serverCounts";

// Runs after a server action that calls rerender(), so it reads the action's bump
export function data() {
  return { bumps: getCounts().dataTitle ?? 0 };
}
