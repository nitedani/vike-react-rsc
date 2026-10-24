import { AsyncLocalStorage } from "node:async_hooks";
import { getShared } from "../shared";

// Set while React renders a page's HTML, and in the work React resumes for it later, e.g. once a Suspense boundary
// resolves. The Flight decodes inside it too, as React resumes a component from the decoder's callbacks once the
// component's Flight chunk or client module has arrived.
const storage = getShared("htmlRender", () => new AsyncLocalStorage<true>());

export function runHtmlRender<T>(render: () => T): T {
  return storage.run(true, render);
}

/** Whether React renders a page's HTML here, so a component calls, not a Vike hook */
export function isInHtmlRender(): boolean {
  return storage.getStore() === true;
}
