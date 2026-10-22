import { increment } from "../../serverCounts";

// Counted, so the e2e can tell which server actions run it
export function data() {
  increment("data /actions");
}
