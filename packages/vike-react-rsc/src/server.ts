// vike-react-rsc/server outside the rsc env, e.g. imported by a client component or by data()
import { notInServerAction } from "./errors";

/** Makes the server action's answer include the page, rendered again once the action returned. Without it, the answer is only the return value. */
export function rerender(): void {
  throw notInServerAction("rerender");
}

/** Headers sent with the server action's answer. A cookie set here also reaches guard() and data() of the same request. */
export function getResponseHeaders(): Headers {
  throw notInServerAction("getResponseHeaders");
}
