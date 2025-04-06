import type { PageContext } from "vike/types";
import type { RscPayload, RscConfig } from "../types";

// Default stale time if not specified in config
const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute by default

// Cache entry type
interface CacheEntry {
  payload: RscPayload;
  timestamp: number;
}

// Initialize the cache on the window object
declare global {
  interface Window {
    __rscCache: Map<string, CacheEntry>;
  }
}

// Initialize the cache
if (typeof window !== "undefined" && !window.__rscCache) {
  window.__rscCache = new Map();
}

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

  const cacheKey = getCacheKey(pageContext);
  const cachedEntry = window.__rscCache.get(cacheKey);

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

  const cacheKey = getCacheKey(pageContext);
  window.__rscCache.set(cacheKey, {
    payload,
    timestamp: Date.now()
  });
  console.log("[RSC Cache] Stored payload for", cacheKey);
}
