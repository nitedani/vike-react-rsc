import type { OnPageTransitionStartSync } from "vike/types";
import { prepareNavigation } from "../runtime/client";

export const onPageTransitionStart: OnPageTransitionStartSync = (
  pageContext
) => {
  prepareNavigation(pageContext);
};
