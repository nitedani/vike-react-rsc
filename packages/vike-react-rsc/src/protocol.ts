// The rsc env, the ssr env and the browser each load their own copy: they agree on values, never on object identity

export const ACTION_HEADER = "x-rsc-action";
export const REDIRECT_HEADER = "x-rsc-redirect";
export const FLIGHT_CONTENT_TYPE = "text/x-component;charset=utf-8";
export const CLIENT_DISCONNECT = "ERR_STREAM_PREMATURE_CLOSE";

export function isActionRequest(request: Request): boolean {
  return request.method === "POST" && !!request.headers.get(ACTION_HEADER);
}

// Not an AbortError: a server component that aborts its own fetch throws one too
export function isClientDisconnect(error: unknown): boolean {
  return (error as { code?: unknown } | undefined)?.code === CLIENT_DISCONNECT;
}
