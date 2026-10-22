import { increment } from "../../serverCounts";

// Counted, so the e2e can tell which server actions run it, and read by the server components an rsc() load returns
export function data() {
  increment("data /actions");
  return { from: "data()" };
}
