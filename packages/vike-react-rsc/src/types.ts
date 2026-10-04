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

/** A server action called from JavaScript, run by renderPage() (integration/actionMiddleware.ts) */
export type RscAction = {
  actionId: string;
  body: string | FormData;
  /** Sent with the response, e.g. the cookies set by the action */
  responseHeaders: Headers;
  hasRun?: true;
  returnValue?: unknown;
  rerender?: boolean;
  /** Set by a throw redirect() in the action */
  redirect?: NonNullable<RscPayload["redirect"]>;
};

/**
 * User-defined RSC configuration
 */
export interface RscConfig {
  /** How long (in ms) a cache entry is considered fresh. Set to 0 to disable caching. */
  staleTime?: number;
}
