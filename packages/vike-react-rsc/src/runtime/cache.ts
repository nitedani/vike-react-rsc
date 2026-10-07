import type { PageContext } from "vike/types";
import { getGlobalClientState } from "./client/globalState";

// Default stale time if not specified in config
const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute by default

function getStaleTime(pageContext: PageContext): number {
  return pageContext.config.rsc?.staleTime ?? DEFAULT_STALE_TIME;
}

/**
 * Mark all server component cache entries as stale
 * This is useful when a server action changes data that server components depend on
 */
export function invalidateServerComponentCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  const globalState = getGlobalClientState();

  globalState.serverComponentCache.forEach((entry) => {
    entry.isStale = true;
  });

  // Pending requests are left alone: they complete normally and refresh the cache.
}

/**
 * Clear all pending server component requests
 * This is useful when navigating between pages or when invalidating the cache
 */
export function clearPendingServerComponentRequests(): void {
  if (typeof window === "undefined") {
    return;
  }

  const globalState = getGlobalClientState();
  // Just clear the map - ongoing requests will still complete
  // but new components with the same cache key will create new requests
  globalState.pendingRequests.clear();
}

/**
 * Get a cached server component if it exists
 * Returns the component even if it's stale (stale-while-revalidate pattern)
 * The caller should check the isStale flag and trigger a revalidation if needed
 */
export function getCachedServerComponent<T>(key: string, pageContext: PageContext): { component: T | null, isStale: boolean } {
  if (typeof window === "undefined") {
    return { component: null, isStale: false };
  }

  const staleTime = getStaleTime(pageContext);
  const globalState = getGlobalClientState();
  const cachedEntry = globalState.serverComponentCache.get(key);

  // If staleTime is 0, caching is disabled
  if (staleTime === 0) {
    return { component: null, isStale: false };
  }

  // No cached entry
  if (!cachedEntry) {
    return { component: null, isStale: false };
  }

  const isStale =
    cachedEntry.isStale === true ||
    Date.now() - cachedEntry.timestamp >= staleTime;

  return {
    component: cachedEntry.payload.returnValue as T,
    isStale
  };
}

/**
 * Store a server component in the cache
 */
export function cacheServerComponent<T>(key: string, component: T, pageContext: PageContext): void {
  if (typeof window === "undefined") {
    return;
  }

  const staleTime = getStaleTime(pageContext);

  // If staleTime is 0, don't cache
  if (staleTime === 0) {
    return;
  }

  const globalState = getGlobalClientState();

  globalState.serverComponentCache.set(key, {
    payload: { returnValue: component },
    timestamp: Date.now(),
    isStale: false
  });
}
