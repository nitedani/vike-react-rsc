import type { Config, PageContextServer } from "vike/types";
import { getRestoredFormState } from "./restoredFormState";

// E.g. an app that restores a form's state from the session, on a request without a form submit
export default (pageContext: PageContextServer) =>
  ({ renderToStreamOptions: { streamOptions: { formState: getRestoredFormState(pageContext) } } }) satisfies Config["react"];
