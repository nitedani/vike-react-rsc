import type { OnPageTransitionStartSync } from "vike/types";
import { onNavigate } from "../runtime/client";

export const onPageTransitionStart: OnPageTransitionStartSync = (
  pageContext
) => {
  onNavigate(pageContext);
};
