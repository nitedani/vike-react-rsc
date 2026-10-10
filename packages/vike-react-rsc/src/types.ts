import type { ReactFormState } from "react-dom/client";
import type { PageContext } from "vike/types";

export type RscPayload = {
  root?: React.ReactNode;
  formState?: ReactFormState;
  returnValue?: unknown;
  error?: {
    reason: ErrorReason;
  };
};

/** Why the page couldn't render */
export type ErrorReason = "not-found" | "error";

export type ActionOutcome = { returnValue: unknown; rerender: boolean };

/** The rsc env's interface to the ssr env: the `rscRuntime` setting */
export type RscRuntime = {
  /** The page, or the action's answer */
  render(pageContext: PageContext): Promise<ReadableStream<Uint8Array>>;
  renderError(reason: ErrorReason): ReadableStream<Uint8Array>;
  runAction(pageContext: PageContext): Promise<ActionOutcome>;
};

/**
 * User-defined RSC configuration
 */
export interface RscConfig {
  /** How long (in ms) a component loaded with `rsc()` is considered fresh on the client. Set to 0 to disable caching. Page navigation always fetches. */
  staleTime?: number;
}
