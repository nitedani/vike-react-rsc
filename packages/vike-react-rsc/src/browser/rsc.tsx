import { useEffect, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import type { PageContext } from "vike/types";
import { usePageContext } from "../pageContext";

type CacheEntry = { component: unknown; timestamp: number; isStale: boolean };

const cache = {
  entries: new Map<string, CacheEntry>(),
  pendingLoads: new Map<string, Promise<any>>(),
  isLoading: false,
};

export function rsc<P, T extends ReactElement<any>>(
  c: (props: P) => Promise<T>
): ComponentType<P & { fallback?: ReactNode }> {
  // Keyed by the cache key, so that new props start over with their own load
  function Load({ cacheKey, props, fallback }: { cacheKey: string; props: P; fallback?: ReactNode }) {
    const pageContext = usePageContext();
    // A stale component shows until its reload arrives
    const { component: cached, isStale } = getCached<T>(cacheKey, pageContext);
    const [loaded, setLoaded] = useState<T>();
    useEffect(() => {
      if (cached && !isStale) return;
      load(cacheKey, () => c(props), pageContext).then((component) => {
        if (component) setLoaded(component);
      });
    }, []);
    const Loading = pageContext.config.Loading?.component || (() => null);
    return loaded ?? cached ?? fallback ?? <Loading />;
  }

  return ({ fallback, ...props }) => {
    const key = `${c.name}-${JSON.stringify(props)}`;
    return <Load key={key} cacheKey={key} props={props as P} fallback={fallback} />;
  };
}

/** True only during rsc()'s call to the server function, which reaches callServer() synchronously */
export function isRscLoading(): boolean {
  return cache.isLoading;
}

export function markRscCacheStale(): void {
  for (const entry of cache.entries.values()) entry.isStale = true;
}

// Renders of the same component share the load in flight
function load<T>(key: string, call: () => Promise<T>, pageContext: PageContext): Promise<T | void> {
  const pendingLoad = cache.pendingLoads.get(key);
  if (pendingLoad) return pendingLoad;
  cache.isLoading = true;
  const loading = call();
  cache.isLoading = false;
  const request = loading
    .then((component) => {
      setCached(key, component, pageContext);
      return component;
    })
    // The fallback, or the stale component, stays
    .catch((error) => console.error("[RSC Client] Error fetching server component:", error))
    .finally(() => cache.pendingLoads.delete(key));
  cache.pendingLoads.set(key, request);
  return request;
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
