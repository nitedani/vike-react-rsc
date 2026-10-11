import { useEffect, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import type { PageContext } from "vike/types";
import { usePageContext } from "../pageContext";

type CacheEntry = { component: unknown; timestamp: number; isStale: boolean };

const cache = {
  entries: new Map<string, CacheEntry>(),
  // Renders of the same component share the load in flight
  pendingLoads: new Map<string, Promise<any>>(),
  isLoading: false,
};

export function rsc<P, T extends ReactElement<any>>(
  c: (props: P) => Promise<T>
): ComponentType<P & { fallback?: ReactNode }> {
  return (props) => {
    const pageContext = usePageContext();
    const { fallback, ...rest } = props;
    const Loading = pageContext.config.Loading?.component || (() => null);
    const key = `${c.name}-${JSON.stringify(rest)}`;
    // A stale component shows until its reload arrives
    const { component: cached, isStale } = getCached<T>(key, pageContext);
    const [loaded, setLoaded] = useState<{ key: string; component: T }>();

    useEffect(() => {
      if (cached && !isStale) return;
      // The props changed before this load arrived: it doesn't replace theirs
      let isCurrent = true;
      const show = (component: T | void) => {
        if (component && isCurrent) setLoaded({ key, component });
      };
      const pendingLoad = cache.pendingLoads.get(key);
      if (pendingLoad) {
        pendingLoad.then(show);
      } else {
        cache.isLoading = true;
        const load = c(rest as P);
        cache.isLoading = false;
        const request = load
          .then((result) => {
            setCached(key, result, pageContext);
            cache.pendingLoads.delete(key);
            return result;
          })
          .catch((error) => {
            // The fallback, or the stale component, stays
            console.error("[RSC Client] Error fetching server component:", error);
            cache.pendingLoads.delete(key);
          });
        cache.pendingLoads.set(key, request);
        request.then(show);
      }
      return () => {
        isCurrent = false;
      };
    }, [key]);

    const component = loaded?.key === key ? loaded.component : cached;
    return component ?? fallback ?? <Loading />;
  };
}

/** True only during rsc()'s call to the server function, which reaches callServer() synchronously */
export function isRscLoading(): boolean {
  return cache.isLoading;
}

export function markRscCacheStale(): void {
  for (const entry of cache.entries.values()) entry.isStale = true;
}

function getCached<T>(key: string, pageContext: PageContext): { component: T | null; isStale: boolean } {
  if (typeof window === "undefined") return { component: null, isStale: false };
  const entry = cache.entries.get(key);
  if (!entry) return { component: null, isStale: false };
  const isStale = entry.isStale || Date.now() - entry.timestamp >= getStaleTime(pageContext);
  return { component: entry.component as T, isStale };
}

function setCached(key: string, component: unknown, pageContext: PageContext): void {
  if (getStaleTime(pageContext) === 0) return;
  cache.entries.set(key, { component, timestamp: Date.now(), isStale: false });
}

function getStaleTime(pageContext: PageContext): number {
  return pageContext.config.rsc?.staleTime ?? 60_000;
}
