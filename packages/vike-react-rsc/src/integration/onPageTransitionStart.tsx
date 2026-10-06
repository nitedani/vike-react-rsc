import type { OnPageTransitionStartSync } from "vike/types";
import { clearPendingServerComponentRequests } from "../runtime/cache";

export const onPageTransitionStart: OnPageTransitionStartSync = () => {
  clearPendingServerComponentRequests();
};
