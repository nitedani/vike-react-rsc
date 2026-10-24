// vike-react-rsc/useConfig in the rsc env, e.g. imported by a server component
import type { PageContextServer } from "vike/types";
import { readPageContext } from "../../rsc/scope";
import type { ConfigViaHook, PageContextInternal } from "../../types";
import { setPageContextConfigViaHook } from "./setPageContextConfigViaHook";

const loggedCallSites = new Set<string | undefined>();

export function useConfig(): (config: ConfigViaHook) => void {
  const pageContext = readPageContext("useConfig()") as PageContextServer & PageContextInternal;
  return (config: ConfigViaHook) => {
    // The call renders nothing, so its values never reach the browser: a client navigation keeps the previous page's title
    logOnce(new Error(`[vike-react-rsc] useConfig() in a server component only sets the HTML <head> of a full page load. Render <Config ${Object.keys(config).map((name) => `${name}={…}`).join(" ")} /> (vike-react-rsc/Config) instead, or start this file with "use client".`));
    // The HTML render reads the same pageContext, until it sends the <head>
    if (!pageContext._headAlreadySet) setPageContextConfigViaHook(config, pageContext);
  };
}

// Once for each line that calls the function useConfig() returns: the error's stack lists the message, that function, then the line
function logOnce(error: Error) {
  const callSite = error.stack?.split("\n")[2];
  if (loggedCallSites.has(callSite)) return;
  loggedCallSites.add(callSite);
  console.error(error);
}
