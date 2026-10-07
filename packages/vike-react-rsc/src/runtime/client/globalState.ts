import type { PageContextClient } from "vike/types";
import type { RscPayload } from "../../types";
import { getGlobalObject } from "../../utils/getGlobalObject";

// Define the structure of our global client state
interface GlobalClientState {
  // Cache for server components used in client components
  serverComponentCache: Map<string, CacheEntry>;

  // Map to track in-flight server component requests
  pendingRequests: Map<string, Promise<any>>;

  // Page context for the current page
  pageContext?: PageContextClient;

  // Flag to indicate if we're currently making a call from a client component to fetch a server component
  isRscCall: boolean;

  // Function to update the UI with a new payload
  setPayload?: React.Dispatch<
    React.SetStateAction<{
      payload: RscPayload;
      pageContext: PageContextClient;
    }>
  >;
}

// Cache entry type
interface CacheEntry {
  component: unknown;
  timestamp: number;
  isStale?: boolean;
}

// Get or initialize the global client state
export function getGlobalClientState(): GlobalClientState {
  return getGlobalObject("globalState.ts", {
    serverComponentCache: new Map(),
    pendingRequests: new Map(),
    isRscCall: false
  });
}
