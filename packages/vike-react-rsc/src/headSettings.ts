import type { Setting } from "./types";

/** The setting's value for this page: a function is called with the pageContext */
export function resolveSetting<Value, PageContext_>(setting: Setting<Value, PageContext_>, pageContext: PageContext_): Value {
  return typeof setting === "function" ? (setting as (pageContext: PageContext_) => Value)(pageContext) : setting;
}
