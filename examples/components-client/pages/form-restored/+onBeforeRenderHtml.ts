import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import type { ReactFormState } from "react-dom/client";
import type { PageContextServer } from "vike/types";
import { getRestoredFormState } from "./restoredFormState";

// Saves the state a form submit returned, and passes the saved one to the browser
export async function onBeforeRenderHtml(pageContext: PageContextServer) {
  pageContext.restoredFormState = getRestoredFormState(pageContext);
  if (!pageContext.rscPayload) return;
  const [forBrowser, forState] = pageContext.rscPayload.tee();
  pageContext.rscPayload = forBrowser;
  const { formState } = await createFromReadableStream<{ formState?: ReactFormState }>(forState);
  if (formState) pageContext.cookies.set("restored-form", JSON.stringify(formState));
}
