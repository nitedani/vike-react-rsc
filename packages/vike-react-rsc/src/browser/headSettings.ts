import type { PageContextClient } from "vike/types";
import { resolveSetting } from "../headSettings";

/** Applies the page's title, description and lang, which the HTML has for the first page only. `undefined` keeps the previous page's. */
export function applyHeadSettings(pageContext: PageContextClient): void {
  const { config } = pageContext;
  const title = resolveSetting(config.title, pageContext);
  const lang = resolveSetting(config.lang, pageContext);
  const description = resolveSetting(config.description, pageContext);
  if (title !== undefined) {
    document.title = title || "";
    setMetaTag("property", "og:title", title);
  }
  if (lang !== undefined) document.documentElement.lang = lang || "en";
  if (description !== undefined) {
    setMetaTag("name", "description", description);
    setMetaTag("property", "og:description", description);
  }
}

// An empty value removes the tag, as the HTML has none for it
function setMetaTag(attribute: "name" | "property", key: string, content: string | null) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!content) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}
