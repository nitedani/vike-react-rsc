import type { ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import { renderToStaticMarkup, type RenderToReadableStreamOptions } from "react-dom/server";
import { renderToReadableStream } from "react-dom/server.edge";
import { renderToStream, type RenderToStreamOptions } from "react-streaming/server.web";
import type { PageContextServer } from "vike/types";
import { getAbort, toVikeAbort, type Abort } from "../abort";
import type { StreamSetting } from "../integration/onRenderHtml";
import { resolveReactOptions } from "../integration/resolveReactOptions";
import { REDIRECT_META_ATTRIBUTE } from "../protocol";
import { getRedirectUrl } from "../redirect";
import type { ClientDeps } from "./clientDeps";

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
  const options: RenderToStreamOptions | undefined = rendersToString ? { streamOptions: renderToStringOptions } : renderToStreamOptions;
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
      if (rendersToString) {
        // Rendered whole, as vike-react's renderToString() renders it, for a crawler too. As on a page that streams, the
        // render stops once the client leaves, or after react-streaming's default timeout, unless it is pre-rendered.
        const render = pageContext.isPrerendering ? undefined : getRenderSignal(htmlRender.signal);
        pageContext.pageHtmlString = await renderWhole(page, { ...streamOptions, signal: render?.signal }, onAbort).finally(render?.clear);
        htmlRender.abort();
      } else {
        const stream = await renderToStream(page, {
          userAgent: pageContext.headers?.["user-agent"],
          // Without `disable`, react-streaming streams, except to bots, which get the page whole
          disable: streamSetting.enable === false || undefined,
          ...options,
          // Always a Web stream: the react-streaming entry imported above renders no Node stream. Vike accepts either
          // kind of stream, so a +react that asks for a Node stream gets the same page.
          webStream: true,
          streamOptions,
          signal: options?.signal ? AbortSignal.any([htmlRender.signal, options.signal]) : htmlRender.signal,
          onBoundaryError: (error) => {
            const abort = getAbort(error);
            if (abort) onAbort(error, abort);
            else options?.onBoundaryError?.(error);
          },
        });
        // react-streaming renders the page whole for a crawler, when pre-rendering, and with
        // { require: true, enable: false }. We wait for its end: react-streaming reports a Suspense boundary's abort
        // late, and Vike can answer it only until this function returns.
        if (stream.disabled) await stream.streamEnd;
        void stream.streamEnd.then(() => htmlRender.abort());
        deps.injectToStream = stream.injectToStream;
        // That stream has ended, so injecting into it would throw. +onAfterRenderHtml gets a new stream with the same
        // HTML, which it can still inject into.
        pageContext.pageHtmlStream = stream.disabled ? toDisabledStream(await new Response(stream.readable).text()) : stream;
      }
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

// A signal that aborts once `signal` does, or after react-streaming's default timeout. Call clear() once the render has
// ended, to stop the timer.
function getRenderSignal(signal: AbortSignal): { signal: AbortSignal; clear: () => void } {
  const timedOut = new AbortController();
  const timer = setTimeout(() => timedOut.abort(), 20 * 1000);
  return { signal: AbortSignal.any([signal, timedOut.signal]), clear: () => clearTimeout(timer) };
}

// A page without +stream, pre-rendered too, waits for every Suspense boundary. React's prerender() would too, but takes
// no CSP nonce. react-streaming would too, but useStream() and useAsync() would then work, while vike-react's
// renderToString() makes them throw an error that says to set stream: true.
async function renderWhole(page: ReactNode, options: RenderToReadableStreamOptions, onAbort: (error: unknown, abort: Abort) => void) {
  const onError: RenderToReadableStreamOptions["onError"] = (error, errorInfo) => {
    const abort = getAbort(error);
    if (abort) onAbort(error, abort);
    // Once the render is aborted, other errors are the abort's consequences: don't log them
    else if (options.signal?.aborted) return;
    // A server component's error comes through the Flight with a digest, and the rsc env has already logged it
    else if (typeof error === "object" && error !== null && "digest" in error) return;
    else if (options.onError) options.onError(error, errorInfo);
    else console.error(error);
  };
  // As react-streaming does when it doesn't stream: React puts every Suspense boundary's content in place, however
  // large, rather than in a hidden part of the HTML that a script moves into place
  const stream = await renderToReadableStream(page, { ...options, progressiveChunkSize: Number.MAX_SAFE_INTEGER, onError });
  await stream.allReady;
  return new Response(stream).text();
}

// A stream like react-streaming's when it doesn't stream, as vike-react's +onAfterRenderHtml gets it. What a hook
// injects goes after the page's HTML, in order, until the stream has been read to its end.
function toDisabledStream(html: string): Awaited<ReturnType<typeof renderToStream>> {
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
      {/* A path keeps the page's own scheme, so any http(s) base tells the same */}
      {"redirect" in abort && getRedirectUrl(abort.redirect.url, "http://localhost") && (
        <meta httpEquiv="refresh" content={`0;url=${abort.redirect.url}`} {...{ [REDIRECT_META_ATTRIBUTE]: "" }} />
      )}
    </>
  );
}
