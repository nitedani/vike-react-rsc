import { renderToStaticMarkup } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlAsync, PageContextServer } from "vike/types";
import { forkPageContext } from "../forkPageContext";
import { configsClientSide } from "../hooks/useConfig/configsClientSide";
import { PageContextProvider } from "../pageContext";
import { FLIGHT_CONTENT_TYPE } from "../protocol";
import { collectClientDeps, renderClientLinks, type ClientDeps } from "../ssr/clientDeps";
import { decodeFlight, renderUntilClientLeaves } from "../ssr/decodeFlight";
import { renderRootToHtml } from "../ssr/renderRootToHtml";
import type { HeadValue } from "../types/Config";
import type { PageContextInternal } from "../types/PageContext";
import { callCumulativeHooks } from "../utils/callCumulativeHooks";
import { getTagAttributesString, type TagAttributes } from "../utils/getTagAttributesString";
import { includes } from "../utils/includes";
import { isReactElement } from "../utils/isReactElement";
import { objectKeys } from "../utils/objectKeys";
import { getHeadSetting } from "./getHeadSetting";
import { getPageElement } from "./getPageElement";
import { withStrictMode } from "./withStrictMode";

addEcosystemStamp();

export const onRenderHtml: OnRenderHtmlAsync = async (pageContext) => {
  // A server action: the answer is Flight, and the middleware (ssr/action.ts) sends it
  const call = pageContext.rscAction;
  if (call?.answersWithFlight) {
    pageContext.content = call.renderAnswer(pageContext);
    pageContext.headersResponse.set("content-type", FLIGHT_CONTENT_TYPE);
    return;
  }
  return collectClientDeps((deps) =>
    renderUntilClientLeaves(pageContext, async (htmlRender) => {
      await renderPageToHtml(pageContext, deps, htmlRender);
      return await buildDocument(pageContext, deps);
    })
  );
};

// The document around the page's HTML, from the HTML injections, the head settings and the tag attributes
async function buildDocument(pageContext: PageContextServer & PageContextInternal, deps: ClientDeps) {
  // +onAfterRenderHtml may replace pageHtmlString or pageHtmlStream, but it must leave only one of them set
  if (pageContext.pageHtmlString !== undefined && pageContext.pageHtmlStream !== undefined) {
    throw new Error(
      "[vike-react-rsc] +onAfterRenderHtml left both pageContext.pageHtmlString and pageContext.pageHtmlStream set: set only one of them, and the other to undefined"
    );
  }
  // A string goes to Vike as a stream. Vike would hold an HTML string until the Flight has ended, and it sends a stream
  // at once.
  const html = pageContext.pageHtmlStream ?? new Response(pageContext.pageHtmlString ?? "").body!;
  // The client components React has loaded so far: every one outside <Suspense>. One inside a <Suspense> that is still
  // pending gets its links in the stream, from setOnClientReference().
  const clientLinks = dangerouslySkipEscape(renderClientLinks(deps));

  const headHtml = getHeadHtml(pageContext);

  const { headHtmlBegin, headHtmlEnd, bodyHtmlBegin, bodyHtmlEnd } = await getHtmlInjections(pageContext);

  const { htmlAttributesString, bodyAttributesString, rootAttributesString } = getTagAttributes(pageContext);

  // Keep only what the client-side applies upon navigation, and remove the rest (HTML-only and/or
  // non-serializable values such as <Head> components). https://github.com/vikejs/vike-vue/issues/233
  removeServerOnlyConfigViaHook(pageContext);

  return {
    documentHtml: escapeInject`<!DOCTYPE html>
<html${dangerouslySkipEscape(htmlAttributesString)}>
  <head>
    <meta charset="UTF-8" />
    ${headHtmlBegin}
    ${headHtml}
    ${clientLinks}
    ${headHtmlEnd}
  </head>
  <body${dangerouslySkipEscape(bodyAttributesString)}>
    ${bodyHtmlBegin}
    <div${dangerouslySkipEscape(rootAttributesString)}>${html}</div>
    ${bodyHtmlEnd}
  </body>
</html>`,
    pageContext: { enableEagerStreaming: true },
  };
}

// As in vike-react: runs +onBeforeRenderHtml, renders the page to pageContext.pageHtmlString or pageHtmlStream, then
// runs +onAfterRenderHtml
async function renderPageToHtml(pageContext: PageContextServer, deps: ClientDeps, htmlRender: AbortController): Promise<void> {
  // Before any HTML hook runs, so that server components see pageContext's keys as on a client navigation, where no HTML
  // hook runs
  // TODO: remove once server components get their own pageContext: https://github.com/nitedani/vike-react-rsc/issues/30
  forkPageContext(pageContext);
  // Under ssr: false the HTML has no page: the browser renders it, from the Flight if it has one
  const ssr = pageContext.config.ssr !== false;
  const flight = ssr && pageContext.rscPayload ? await decodeFlight(pageContext, deps, htmlRender.signal) : undefined;
  // The root from the Flight, else the element of the client Page, else none
  const root = ssr ? (flight?.root ?? (pageContext.config.Page ? getPageElement(pageContext) : null)) : null;
  if (root !== null) pageContext.page = withStrictMode(pageContext, <PageContextProvider pageContext={pageContext}>{root}</PageContextProvider>);
  // https://github.com/vikejs/vike-react/issues/87#issuecomment-2488742744
  await callCumulativeHooks(pageContext.config.onBeforeRenderHtml, pageContext);
  // Stop if the client left while +onBeforeRenderHtml ran
  htmlRender.signal.throwIfAborted();
  await renderRootToHtml(pageContext, deps, htmlRender, resolveStreamSetting(pageContext), flight?.formState);
  // https://github.com/vikejs/vike/discussions/1804#discussioncomment-10394481
  await callCumulativeHooks(pageContext.config.onAfterRenderHtml, pageContext);
}

function removeServerOnlyConfigViaHook(pageContext: PageContextInternal) {
  const configViaHook = pageContext._configViaHook;
  if (!configViaHook) return;
  objectKeys(configViaHook).forEach((configName) => {
    if (!includes(configsClientSide, configName)) delete configViaHook[configName];
  });
  // Remove it altogether if there isn't anything left, saving KBs sent to the client
  if (objectKeys(configViaHook).length === 0) delete pageContext._configViaHook;
}

function getHeadHtml(pageContext: PageContextServer & PageContextInternal) {
  pageContext._headAlreadySet = true;

  const favicon = getHeadSetting<string | null>("favicon", pageContext);
  const title = getHeadSetting<string | null>("title", pageContext);
  const description = getHeadSetting<string | null>("description", pageContext);
  const image = getHeadSetting<string | null>("image", pageContext);

  const faviconTag = !favicon ? "" : escapeInject`<link rel="icon" href="${favicon}" />`;
  const titleTags = !title ? "" : escapeInject`<title>${title}</title><meta property="og:title" content="${title}" />`;
  const descriptionTags = !description
    ? ""
    : escapeInject`<meta name="description" content="${description}" /><meta property="og:description" content="${description}" />`;
  const imageTags = !image
    ? ""
    : escapeInject`<meta property="og:image" content="${image}"><meta name="twitter:card" content="summary_large_image">`;
  const viewportTag = dangerouslySkipEscape(getViewportTag(getHeadSetting<Viewport>("viewport", pageContext)));

  const headElementsHtml = dangerouslySkipEscape(
    [
      // Added by +Head
      ...(pageContext.config.Head ?? []),
      // Added by useConfig()
      ...(pageContext._configViaHook?.Head ?? []),
    ]
      .filter((Head) => Head !== null && Head !== undefined)
      .map((Head) => getHeadElementHtml(Head, pageContext))
      .join("\n")
  );

  const headHtml = escapeInject`
    ${titleTags}
    ${viewportTag}
    ${headElementsHtml}
    ${faviconTag}
    ${descriptionTags}
    ${imageTags}
  `;
  return headHtml;
}
function getHeadElementHtml(Head: NonNullable<HeadValue>, pageContext: PageContextServer): string {
  return renderToStaticMarkup(
    withStrictMode(pageContext, <PageContextProvider pageContext={pageContext}>{isReactElement(Head) ? Head : <Head />}</PageContextProvider>)
  );
}

function getTagAttributes(pageContext: PageContextServer) {
  let lang = getHeadSetting<string | null>("lang", pageContext);
  // Don't set `lang` to its default value if it's `null` (so that users can set it to `null` in order to remove the default value)
  if (lang === undefined) lang = "en";

  const bodyAttributes = mergeTagAttributesList(getHeadSetting<TagAttributes[]>("bodyAttributes", pageContext));
  const htmlAttributes = mergeTagAttributesList(getHeadSetting<TagAttributes[]>("htmlAttributes", pageContext));
  const rootAttributes = mergeTagAttributesList(getHeadSetting<TagAttributes[]>("rootAttributes", pageContext));

  const bodyAttributesString = getTagAttributesString(bodyAttributes);
  const htmlAttributesString = getTagAttributesString({ ...htmlAttributes, lang: lang ?? htmlAttributes.lang });
  // The root element's `id` is used by onRenderClient(): it's the user's responsibility not to override it.
  const rootAttributesString = getTagAttributesString({ id: "root", ...rootAttributes });

  return { htmlAttributesString, bodyAttributesString, rootAttributesString };
}
function mergeTagAttributesList(tagAttributesList: TagAttributes[] = []) {
  const tagAttributes: TagAttributes = {};
  tagAttributesList.forEach((tagAttrs) => Object.assign(tagAttributes, tagAttrs));
  return tagAttributes;
}

export type Viewport = "responsive" | number | null;
function getViewportTag(viewport: Viewport | undefined): string {
  if (viewport === "responsive" || viewport === undefined) {
    // `user-scalable=no` isn't recommended anymore:
    //   - https://stackoverflow.com/questions/22354435/to-user-scalable-no-or-not-to-user-scalable-no/22544312#comment120949420_22544312
    return '<meta name="viewport" content="width=device-width,initial-scale=1">';
  }
  if (typeof viewport === "number") {
    return `<meta name="viewport" content="width=${viewport}">`;
  }
  return "";
}

// As in vike-react. With this flag, react-streaming's and Vike's errors tell the user to set +stream, e.g. for
// useAsync() on a page that doesn't stream, rather than to install react-streaming.
function addEcosystemStamp() {
  const g = globalThis as Record<string, unknown>;
  g._isVikeReactApp = {};
}

export type HtmlInjection = string | ((pageContext: PageContextServer) => string);

async function getHtmlInjections(pageContext: PageContextServer) {
  const { config } = pageContext;
  const renderHooks = async (hooks: HtmlInjection[] | undefined) => {
    const values = await callCumulativeHooks(hooks, pageContext);
    return dangerouslySkipEscape(values.join(""));
  };
  const [headHtmlBegin, headHtmlEnd, bodyHtmlBegin, bodyHtmlEnd] = await Promise.all([
    renderHooks(config.headHtmlBegin),
    renderHooks(config.headHtmlEnd),
    renderHooks(config.bodyHtmlBegin),
    renderHooks(config.bodyHtmlEnd),
  ]);
  return { bodyHtmlBegin, bodyHtmlEnd, headHtmlBegin, headHtmlEnd };
}

// As vike-react's resolveStreamSetting()
export type StreamSetting = { enable: boolean | null; require: boolean };
function resolveStreamSetting(pageContext: PageContextServer): StreamSetting {
  const streamSetting: StreamSetting = { enable: null, require: false };
  pageContext.config.stream
    ?.slice()
    .reverse()
    .forEach((setting) => {
      if (typeof setting === "boolean") streamSetting.enable = setting;
      else if (setting) {
        if (setting.enable !== null) streamSetting.enable = setting.enable ?? true;
        if (setting.require !== undefined) streamSetting.require = setting.require;
      }
    });
  return streamSetting;
}
