import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { PageContextServer } from "vike/types";
import { resolveSetting } from "../headSettings";
import type { Setting, TagAttributes, Viewport } from "../types";

type Html = ReturnType<typeof dangerouslySkipEscape>;

/** The tags of the title, description, image, viewport and favicon settings */
export function renderHeadSettings(pageContext: PageContextServer): ReturnType<typeof escapeInject> {
  const { config } = pageContext;
  const title = resolveSetting(config.title, pageContext);
  const description = resolveSetting(config.description, pageContext);
  const image = resolveSetting(config.image, pageContext);
  const favicon = resolveSetting(config.favicon, pageContext);
  const titleTags = title ? escapeInject`<title>${title}</title><meta property="og:title" content="${title}" />` : "";
  const descriptionTags = description
    ? escapeInject`<meta name="description" content="${description}" /><meta property="og:description" content="${description}" />`
    : "";
  const imageTags = image
    ? escapeInject`<meta property="og:image" content="${image}" /><meta name="twitter:card" content="summary_large_image" />`
    : "";
  const faviconTag = favicon ? escapeInject`<link rel="icon" href="${favicon}" />` : "";
  const viewportTag = renderViewport(resolveSetting(config.viewport, pageContext));
  return escapeInject`${titleTags}${viewportTag}${faviconTag}${descriptionTags}${imageTags}`;
}

/** The attributes of `<html>`, `<body>` and `<div id="root">`, each with a leading space */
export function renderTagAttributes(pageContext: PageContextServer): { html: Html; body: Html; root: Html } {
  const { config } = pageContext;
  const lang = resolveSetting(config.lang, pageContext);
  const htmlAttributes = mergeAttributes(config.htmlAttributes, pageContext);
  return {
    // `null` removes the default
    html: renderAttributes({ ...htmlAttributes, lang: lang === undefined ? "en" : (lang ?? htmlAttributes.lang) }),
    body: renderAttributes(mergeAttributes(config.bodyAttributes, pageContext)),
    // onRenderClient hydrates #root
    root: renderAttributes({ id: "root", ...mergeAttributes(config.rootAttributes, pageContext) }),
  };
}

/** The raw HTML of headHtmlBegin, headHtmlEnd, bodyHtmlBegin and bodyHtmlEnd */
export function renderHtmlInjections(pageContext: PageContextServer): Record<"headBegin" | "headEnd" | "bodyBegin" | "bodyEnd", Html> {
  const { config } = pageContext;
  const join = (settings: Setting<string, PageContextServer>[] = []) =>
    dangerouslySkipEscape(settings.map((setting) => resolveSetting(setting, pageContext)).join(""));
  return {
    headBegin: join(config.headHtmlBegin),
    headEnd: join(config.headHtmlEnd),
    bodyBegin: join(config.bodyHtmlBegin),
    bodyEnd: join(config.bodyHtmlEnd),
  };
}

function renderViewport(viewport: Viewport) {
  if (viewport === null) return "";
  const content = typeof viewport === "number" ? `width=${viewport}` : "width=device-width,initial-scale=1";
  return dangerouslySkipEscape(`<meta name="viewport" content="${content}" />`);
}

// Vike lists a cumulative setting's values from the most specific, so the app's override its extensions'
function mergeAttributes(settings: Setting<TagAttributes, PageContextServer>[] | undefined, pageContext: PageContextServer) {
  const merged: TagAttributes = {};
  for (const setting of (settings ?? []).toReversed()) Object.assign(merged, resolveSetting(setting, pageContext));
  return merged;
}

function renderAttributes(attributes: TagAttributes) {
  const rendered = Object.entries(attributes)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([name, value]) => {
      if (!/^[a-z][a-z0-9-]*$/i.test(name) || name.endsWith("-")) {
        throw new Error(`[vike-react-rsc] Invalid HTML attribute name ${JSON.stringify(name)}`);
      }
      // In a quoted attribute value, only `&` and `"` are markup
      return ` ${name}="${String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`;
    });
  return dangerouslySkipEscape(rendered.join(""));
}
