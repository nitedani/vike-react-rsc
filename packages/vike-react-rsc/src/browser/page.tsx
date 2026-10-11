import { useEffect, useState, type Dispatch, type ReactElement, type SetStateAction } from "react";
import type { PageContextClient } from "vike/types";
import { PageContextProvider } from "../pageContext";
import type { PagePayload } from "../types";

type Page = { pageContext: PageContextClient; payload: PagePayload };

const current: {
  pageContext?: PageContextClient;
  setPage?: Dispatch<SetStateAction<Page>>;
  // Kept until Root mounts, e.g. a navigation that ended while React was hydrating
  pendingUpdates: SetStateAction<Page>[];
} = { pendingUpdates: [] };

/** Vike started rendering it: actions now go to its URL, and earlier actions' payloads are stale */
export function setCurrentPageContext(pageContext: PageContextClient): void {
  current.pageContext = pageContext;
}

export function getCurrentPageContext(): PageContextClient | undefined {
  return current.pageContext;
}

export function isCurrent(pageContext: PageContextClient): boolean {
  return current.pageContext === pageContext;
}

export function Root({ page }: { page: Page }): ReactElement {
  const [{ pageContext, payload }, setPage] = useState(page);
  useEffect(() => {
    current.setPage = setPage;
    for (const update of current.pendingUpdates.splice(0)) setPage(update);
  }, []);
  return <PageContextProvider pageContext={pageContext}>{payload.root}</PageContextProvider>;
}

export function showPage(update: SetStateAction<Page>): void {
  if (current.setPage) current.setPage(update);
  else current.pendingUpdates.push(update);
}

export function showPayload(payload: PagePayload): void {
  showPage((page) => ({ pageContext: page.pageContext, payload }));
}
