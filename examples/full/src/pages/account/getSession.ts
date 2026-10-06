export function getSession(headers?: Record<string, string> | null): string | null {
  const match = /(?:^|;\s*)session=([^;]+)/.exec(headers?.cookie ?? "");
  return match ? decodeURIComponent(match[1]) : null;
}
