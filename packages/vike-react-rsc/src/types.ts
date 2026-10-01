import type { ReactFormState } from "react-dom/client";

export type RscPayload = {
  root?: React.ReactNode;
  formState?: ReactFormState;
  returnValue?: unknown;
  redirect?: {
    url: string;
    statusCode: number;
  };
  error?: {
    reason: "not-found" | "error" | "base-missing";
  };
};

/** What renderRsc() renders: the page by default. */
export type RenderRscRequest = {
  payload?: RscPayload;
  action?: { actionId: string; body: string | FormData };
};

/** A chunk of the Flight stream: UTF-8 text, or base64 when it isn't valid UTF-8. */
export type EncodedRscChunk = string | { base64: string };

/**
 * User-defined RSC configuration
 */
export interface RscConfig {
  /** How long (in ms) a cache entry is considered fresh. Set to 0 to disable caching. */
  staleTime?: number;
}
