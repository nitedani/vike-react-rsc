import type { ReactFormState } from "react-dom/client";

export type RscPayload = {
  root?: React.ReactNode;
  formState?: ReactFormState;
  returnValue?: unknown;
};

/**
 * User-defined RSC configuration
 */
export interface RscConfig {
  /** How long (in ms) a cache entry is considered fresh. Set to 0 to disable caching. */
  staleTime?: number;
}
