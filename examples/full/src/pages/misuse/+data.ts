import { getResponseHeaders, rerender } from "vike-react-rsc/server";
import { getError } from "./getError";

// A Vike hook runs outside the rsc env
export function data() {
  return { rerender: getError(rerender), getResponseHeaders: getError(getResponseHeaders) };
}
