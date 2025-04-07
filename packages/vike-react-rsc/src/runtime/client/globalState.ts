import type { PageContextClient } from "vike/types";
import type { RscPayload } from "../../types";
import { getGlobalObject } from "../../utils/getGlobalObject";

// Define the structure of our global client state
export interface GlobalClientState {
  // Cache for main RSC payloads
  rscCache: Map<string, CacheEntry>;

  // Cache for server components used in client components
  serverComponentCache: Map<string, CacheEntry>;

  // Map to track in-flight server component requests
  pendingRequests: Map<string, Promise<any>>;

  // Page context for the current page
  pageContext?: PageContextClient;

  // Promise for the current navigation
  navigationPromise?: Promise<RscPayload>;

  // Flag to indicate if we're currently making a call from a client component to fetch a server component
  isRscCall: boolean;

  // Function to update the UI with a new payload
  setPayload?: React.Dispatch<
    React.SetStateAction<{
      payload: RscPayload;
      pageContext: PageContextClient;
    }>
  >;

  // Reference to the callServer function
  vikeRscCallServer?: Function;
}

// Cache entry type
export interface CacheEntry {
  payload: RscPayload;
  timestamp: number;
  isStale?: boolean;
  revalidating?: boolean;
}

// Get or initialize the global client state
export function getGlobalClientState(): GlobalClientState {
  return getGlobalObject("globalState.ts", {
    rscCache: new Map(),
    serverComponentCache: new Map(),
    pendingRequests: new Map(),
    isRscCall: false
  });
}
