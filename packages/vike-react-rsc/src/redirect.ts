/** Where a redirect to `url` goes from a page at `base`, or undefined if that isn't an http(s) URL: an HTTP redirect
 * never runs e.g. a javascript: URL, but location.href would */
export function getRedirectUrl(url: string, base: string): URL | undefined {
  const target = new URL(url, base);
  return target.protocol === "http:" || target.protocol === "https:" ? target : undefined;
}
