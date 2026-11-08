import { pipeline, Readable, type Writable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { ReactFormState } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToStream, type RenderToStreamOptions } from "react-streaming/server.web";
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
      // react-streaming renders the page whole on a page without +stream, for a crawler, when pre-rendering, and with
      // { require: true, enable: false }. We wait for its end: react-streaming reports a Suspense boundary's abort
      // late, and Vike can answer it only until this function returns.
      if (stream.disabled) await stream.streamEnd;
      void stream.streamEnd.then(() => htmlRender.abort());
      deps.injectToStream = stream.injectToStream;
      // A string, as vike-react's renderToString() gives +onAfterRenderHtml
      if (rendersToString) pageContext.pageHtmlString = await new Response(stream.readable).text();
      else {
        // That stream has ended, so injecting into it would throw. +onAfterRenderHtml gets a new stream with the same
        // HTML, which it can still inject into.
        const htmlStream = stream.disabled ? toDisabledStream(await new Response(stream.readable).text()) : stream;
        pageContext.pageHtmlStream = streamSetting.type === "node" ? toNodeStream(htmlStream) : htmlStream;
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

// As React logs a Suspense boundary's error when vike-react renders to a string
function logBoundaryError(error: unknown, signal: AbortSignal) {
  // Once the render is aborted, other errors are the abort's consequences
  if (signal.aborted) return;
  // A server component's error comes through the Flight with a digest, and the rsc env has already logged it
  if (typeof error === "object" && error !== null && "digest" in error) return;
  console.error(error);
}

// The same stream as a Node.js stream, as react-streaming renders it for vike-react's +stream { type: 'node' }
function toNodeStream(stream: HtmlStream): HtmlStream {
  const readable = stream.readable! as NodeReadableStream;
  return {
    ...stream,
    readable: null,
    pipe: (writable) => {
      const nodeReadable = Readable.fromWeb(readable);
      // On an error, pipeline() has already destroyed both: a client that leaves cancels the render
      pipeline(nodeReadable, writable, () => {});
      // As Vike pipes a Web stream: e.g. compression() holds the writes until flush()
      const flushable = writable as Writable & { flush?: () => void };
      nodeReadable.on("data", () => flushable.flush?.());
    },
  };
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
