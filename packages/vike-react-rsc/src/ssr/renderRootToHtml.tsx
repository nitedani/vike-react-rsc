import type { ReactFormState } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToStream, type RenderToStreamOptions } from "react-streaming/server";
import type { PageContextServer } from "vike/types";
import { getAbort, toVikeAbort, type Abort } from "../abort";
import type { StreamSetting } from "../integration/onRenderHtml";
import { resolveReactOptions } from "../integration/resolveReactOptions";
import { REDIRECT_META_ATTRIBUTE } from "../protocol";
import { isHttpUrl } from "../redirect";
import type { ClientDeps } from "./clientDeps";

type HtmlStream = Awaited<ReturnType<typeof renderToStream>>;

// Renders pageContext.page, which +onBeforeRenderHtml may have replaced, to pageContext.pageHtmlString or pageHtmlStream
export async function renderRootToHtml(
  pageContext: PageContextServer,
  deps: ClientDeps,
  htmlRender: AbortController,
  streamSetting: StreamSetting,
  formState: ReactFormState | undefined
): Promise<void> {
  const { renderToStringOptions, renderToStreamOptions } = resolveReactOptions(pageContext);
  // On a page that vike-react renders with renderToString(), only renderToStringOptions apply. We pass them to React's
  // stream render, because server components can't render to a string.
  const rendersToString = !streamSetting.enable && !streamSetting.require;
  const options: RenderToStreamOptions | undefined = rendersToString
    ? {
        streamOptions: renderToStringOptions,
        // A pre-render waits for every Suspense boundary, however long it takes
        timeout: pageContext.isPrerendering ? null : undefined,
        // So that logBoundaryError() doesn't log the errors the timeout causes
        onTimeout: () => htmlRender.abort(),
        onBoundaryError: (error) => logBoundaryError(error, htmlRender.signal),
      }
    : renderToStreamOptions;
  const streamOptions = {
    ...options?.streamOptions,
    nonce: pageContext.cspNonce ?? options?.streamOptions?.nonce,
    formState: formState ?? options?.streamOptions?.formState,
  };
  // A server component may `throw redirect()` or `throw render()`. Until this function returns, Vike can still answer
  // it. After that, the HTML has started, so only tags we inject into the stream can tell the browser.
  let boundaryAbort: unknown;
  const onAbort = (error: unknown, abort: Abort) => {
    if (deps.injectToStream) deps.injectToStream(renderAbortMeta(abort));
    else boundaryAbort ??= error;
  };
  try {
    const { page } = pageContext;
    if (page) {
      const stream = await renderToStream(page, {
        userAgent: pageContext.headers?.["user-agent"],
        // Without `disable`, react-streaming streams, except to bots, which get the page whole
        disable: rendersToString || streamSetting.enable === false || undefined,
        ...options,
        // A Web stream, but for +stream { type: 'node' }, where react-streaming renders a Node.js stream on Node.js and
        // a Web stream on a Worker, which has no Node.js stream renderer
        webStream: rendersToString || streamSetting.type === "web" || undefined,
        streamOptions,
        signal: options?.signal ? AbortSignal.any([htmlRender.signal, options.signal]) : htmlRender.signal,
        onBoundaryError: (error) => {
          const abort = getAbort(error);
          if (abort) onAbort(error, abort);
          else options?.onBoundaryError?.(error);
        },
      });
      // react-streaming renders the page whole on a page without +stream, for a crawler, when pre-rendering, and with
      // { require: true, enable: false }. It reports a Suspense boundary's abort a macrotask late, and Vike can answer
      // it only until this function returns. So we wait for a Web stream's end, or, as a Node.js stream ends only once
      // Vike pipes it, for the next macrotask.
      if (stream.disabled) await (stream.readable ? stream.streamEnd : new Promise((resolve) => setImmediate(resolve)));
      void stream.streamEnd.then(() => htmlRender.abort());
      deps.injectToStream = stream.injectToStream;
      // A string, as vike-react's renderToString() gives +onAfterRenderHtml
      if (rendersToString) pageContext.pageHtmlString = await new Response(stream.readable).text();
      // A Web stream rendered whole has ended, so injecting into it would throw. +onAfterRenderHtml gets a new stream
      // with the same HTML, which it can still inject into.
      else if (stream.disabled && stream.readable)
        pageContext.pageHtmlStream = toDisabledStream(await new Response(stream.readable).text());
      else pageContext.pageHtmlStream = stream;
    }
    // An abort thrown inside a Suspense boundary and reported before this function returns, e.g. on a page rendered
    // whole: Vike answers it
    if (boundaryAbort) throw boundaryAbort;
  } catch (error) {
    const abort = getAbort(error);
    if (!abort) throw error;
    throw toVikeAbort(abort);
  }
}

// As React logs a Suspense boundary's error when vike-react renders to a string
function logBoundaryError(error: unknown, signal: AbortSignal) {
  // Once the render is aborted, other errors are the abort's consequences
  if (signal.aborted) return;
  // A server component's error comes through the Flight with a digest, and the rsc env has already logged it
  if (typeof error === "object" && error !== null && "digest" in error) return;
  console.error(error);
}

// A stream like react-streaming's when it doesn't stream, as vike-react's +onAfterRenderHtml gets it. What a hook
// injects goes after the page's HTML, in order, until the stream has been read to its end.
function toDisabledStream(html: string): HtmlStream {
  const chunks: (string | Promise<string>)[] = [html];
  let ended = false;
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        const chunk = chunks.shift();
        if (chunk === undefined) {
          ended = true;
          controller.close();
        } else controller.enqueue(encoder.encode(await chunk));
      },
    },
    // Pulled only when read, so the hooks can inject first
    { highWaterMark: 0 },
  );
  return {
    readable,
    pipe: null,
    disabled: true,
    streamEnd: Promise.resolve(true),
    hasStreamEnded: () => ended,
    doNotClose: () => () => {},
    abort: () => {},
    injectToStream: (chunk) => {
      if (ended) throw new Error("[vike-react-rsc] pageContext.pageHtmlStream.injectToStream() was called after the stream ended");
      chunks.push(chunk);
    },
  };
}

// Once the HTML has started: search engines skip the page, and a redirect works without JavaScript
function renderAbortMeta(abort: Abort) {
  return renderToStaticMarkup(
    <>
      <meta name="robots" content="noindex" />
      {"redirect" in abort && isHttpUrl(abort.redirect.url) && (
        <meta httpEquiv="refresh" content={`0;url=${abort.redirect.url}`} {...{ [REDIRECT_META_ATTRIBUTE]: "" }} />
      )}
    </>
  );
}
