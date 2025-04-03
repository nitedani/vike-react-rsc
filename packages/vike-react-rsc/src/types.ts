import type { ReactFormState } from "react-dom/client";
export interface ImportManifestEntry {
  id: string;
  name: string;
  chunks: string[];
  async?: boolean;
}

export interface BundlerConfig {
  [bundlerId: string]: ImportManifestEntry;
}

export type RscPayload = {
  root: React.ReactNode;
  formState?: ReactFormState;
  returnValue?: unknown;
};
