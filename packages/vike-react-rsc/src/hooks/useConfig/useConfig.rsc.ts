// vike-react-rsc/useConfig in the rsc env, e.g. imported by a server component
import type { PageContextServer } from "vike/types";
import { readHtmlPageContext } from "../../rsc/scope";
import type { ConfigViaHook, PageContextInternal } from "../../types";
import { setPageContextConfigViaHook } from "./setPageContextConfigViaHook";

const loggedCallSites = new Set<string | undefined>();

export function useConfig(): (config: ConfigViaHook) => void {
  const pageContext = readHtmlPageContext("useConfig()") as PageContextServer & PageContextInternal;
  return (config: ConfigViaHook) => {
    // The call renders nothing, so its values never reach the browser: a client navigation keeps the previous page's title
    logOnce(new Error(`[vike-react-rsc] useConfig() in a server component only sets the HTML <head> of a full page load. Render <Config ${Object.keys(config).map((name) => `${name}={…}`).join(" ")} /> (vike-react-rsc/Config) instead, or start this file with "use client".`));
    // Until the HTML render sends the <head>, which reads this pageContext
    if (!pageContext._headAlreadySet) setPageContextConfigViaHook(config, pageContext);
  };
}

// Logs once per line that calls the setter: line 2 of the error's stack is that line, after the message and the setter
function logOnce(error: Error) {
  const callSite = error.stack?.split("\n")[2];
  if (loggedCallSites.has(callSite)) return;
  loggedCallSites.add(callSite);
  console.error(error);
}
