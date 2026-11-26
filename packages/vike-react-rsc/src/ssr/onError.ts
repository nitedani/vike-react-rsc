import type { PageContextServer } from "vike/types";
import { getLoadErrorHint } from "../clientApiHint";

// A server file that uses a browser-only React API as it loads fails before any server component renders
export function onError(error: unknown, pageContext: PageContextServer | null): void {
  const hint = getLoadErrorHint(error, pageContext?.pageId ?? undefined);
  if (hint) console.error(`[vike-react-rsc] ${hint}`);
}
