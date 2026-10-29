import type { ReactFormState } from "react-dom/client";
import type { PageContextServer } from "vike/types";

// The state a form submit returned, which +onBeforeRenderHtml saved in a cookie
export function getRestoredFormState(pageContext: PageContextServer): ReactFormState | undefined {
  const saved = pageContext.cookies.get("restored-form");
  return saved ? JSON.parse(saved) : undefined;
}

declare global {
  namespace Vike {
    interface PageContext {
      restoredFormState?: ReactFormState;
    }
  }
}
