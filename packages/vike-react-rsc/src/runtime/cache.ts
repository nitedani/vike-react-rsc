import type { PageContext } from "vike/types";
import type { RscPayload, RscConfig } from "../types";
import { getGlobalClientState } from "./client/globalState";

// Default stale time if not specified in config
const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute by default

// Re-export the CacheEntry type from globalState
export type { CacheEntry } from "./client/globalState";

/**
 * Get the cache key for a page context
 */
export function getCacheKey(pageContext: PageContext): string {
  return `${pageContext.urlPathname}${pageContext.urlParsed.searchOriginal || ""}`;
}

/**
 * Get stale time from page context
 */
export function getStaleTime(pageContext: PageContext): number {
  const userConfig = pageContext.config?.rsc as RscConfig | undefined;
  return userConfig?.staleTime !== undefined ? userConfig.staleTime : DEFAULT_STALE_TIME;
}

/**
 * Get a cached entry if it exists and is not stale
 */
export function getCachedPayload(pageContext: PageContext): RscPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const staleTime = getStaleTime(pageContext);

  // If staleTime is 0, caching is disabled
  if (staleTime === 0) {
    return null;
  }

  const globalState = getGlobalClientState();
  const cacheKey = getCacheKey(pageContext);
  const cachedEntry = globalState.rscCache.get(cacheKey);

  // If we have a cached entry that's not stale, use it
  if (cachedEntry && (Date.now() - cachedEntry.timestamp) < staleTime) {
    console.log("[RSC Cache] Using cached payload for", cacheKey);
    return cachedEntry.payload;
  }

  return null;
}

/**
 * Store a payload in the cache
 */
export function cachePayload(pageContext: PageContext, payload: RscPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  const staleTime = getStaleTime(pageContext);

  // If staleTime is 0, don't cache
  if (staleTime === 0) {
    return;
  }

  const globalState = getGlobalClientState();
  const cacheKey = getCacheKey(pageContext);
  globalState.rscCache.set(cacheKey, {
    payload,
    timestamp: Date.now()
  });
  console.log("[RSC Cache] Stored payload for", cacheKey);
}

/**
 * Invalidate the cache entry for a specific page
 */
export function invalidateCache(pageContext: PageContext): void {
  if (typeof window === "undefined") {
    return;
  }

  const globalState = getGlobalClientState();

  // Invalidate the main RSC cache for the current page
  const cacheKey = getCacheKey(pageContext);
  if (globalState.rscCache.has(cacheKey)) {
    globalState.rscCache.delete(cacheKey);
    console.log("[RSC Cache] Invalidated main cache for", cacheKey);
  }
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

  // Mark all server component cache entries as stale
  if (globalState.serverComponentCache.size > 0) {
    let staleCount = 0;

    // Iterate through all cache entries and mark them as stale
    globalState.serverComponentCache.forEach((entry) => {
      if (!entry.isStale) {
        entry.isStale = true;
        staleCount++;
      }
    });

    if (staleCount > 0) {
      console.log(`[RSC Cache] Marked ${staleCount} server component cache entries as stale`);
    }
  }

  // We don't clear pending requests - they'll complete normally
  // and update the cache with fresh data
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
  console.log("[RSC Cache] Cleared pending server component requests");
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

  // Extract component name from the key for better logging
  const componentName = key.split('-')[0];

  // Check if the entry is explicitly marked as stale
  const isExplicitlyStale = cachedEntry.isStale === true;

  // Check if the entry is time-based stale (exceeded staleTime)
  const isTimeStale = (Date.now() - cachedEntry.timestamp) >= staleTime;

  // Entry is stale if either explicitly marked or time-based
  const isStale = isExplicitlyStale || isTimeStale;

  if (isStale) {
    console.log(`[RSC Cache] Using stale server component: ${componentName}`);
  } else {
    console.log(`[RSC Cache] Using fresh server component: ${componentName}`);
  }

  return {
    component: cachedEntry.payload.returnValue as T,
    isStale
  };
}

/**
 * Mark a server component as being revalidated
 */
export function markServerComponentRevalidating(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const globalState = getGlobalClientState();
  const cachedEntry = globalState.serverComponentCache.get(key);

  if (cachedEntry) {
    cachedEntry.revalidating = true;

    // Extract component name from the key for better logging
    const componentName = key.split('-')[0];
    console.log(`[RSC Cache] Revalidating server component: ${componentName}`);
  }
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

  // Store the component with fresh state
  globalState.serverComponentCache.set(key, {
    payload: { returnValue: component },
    timestamp: Date.now(),
    isStale: false,
    revalidating: false
  });

  // Extract component name from the key for better logging
  const componentName = key.split('-')[0];
  console.log(`[RSC Cache] Stored fresh server component: ${componentName}`);
}
