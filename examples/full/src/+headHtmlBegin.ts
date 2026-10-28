import type { PageContextServer } from "vike/types";

// Async, as vike-react allows; every page's HTML has it, see testHeadSettings(). On /slow-head-html it awaits a service,
// longer than /slow-client's Suspense boundary waits.
export default async (pageContext: PageContextServer) => {
  if (pageContext.urlPathname === "/slow-head-html") await new Promise((resolve) => setTimeout(resolve, 2000));
  return "<!-- headHtmlBegin -->";
};
