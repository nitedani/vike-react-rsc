import React, { type ComponentType, useEffect } from "react";
import { usePageContext } from "../hooks/pageContext/pageContext-client";
import { getCachedServerComponent, cacheServerComponent } from "./cache";
import { getGlobalClientState } from "./client/globalState";

export function rsc<P, T extends React.ReactElement<any>>(
  c: (props: P) => Promise<T>
): ComponentType<P & { fallback?: React.ReactNode }> {
  return (props) => {
    const pageContext = usePageContext();
    const { fallback, ...rest } = props;
    const Loading = pageContext.config.Loading?.component || (() => null);
    const fallback_ = fallback ?? <Loading />;

    // Generate a cache key based on the component function and props
    const cacheKey = `${c.name}-${JSON.stringify(rest)}`;

    // Try to get the component from cache (may be stale)
    const { component: cachedComponent, isStale } = getCachedServerComponent<T>(cacheKey, pageContext);

    // Initialize state with cached component (even if stale)
    const [comp, setComp] = React.useState<T | null>(cachedComponent);

    useEffect(() => {
      const globalState = getGlobalClientState();

      const fetchOrRevalidate = () => {
        // pendingRequests owns de-duplication: concurrent renders of the same
        // component subscribe to the in-flight promise instead of refetching.
        const pendingRequest = globalState.pendingRequests.get(cacheKey);

        if (pendingRequest) {
          pendingRequest.then(setComp);
          return;
        }

        // Tells callServer this fetch originates from a client component.
        globalState.isRscCall = true;
        const serverComponentPromise = c(rest as P);
        globalState.isRscCall = false;

        const requestPromise = serverComponentPromise
          .then((result) => {
            cacheServerComponent(cacheKey, result, pageContext);
            globalState.pendingRequests.delete(cacheKey);
            return result;
          })
          .catch((error) => {
            console.error("[RSC Client] Error fetching server component:", error);
            globalState.pendingRequests.delete(cacheKey);
            throw error;
          });

        globalState.pendingRequests.set(cacheKey, requestPromise);
        requestPromise.then(setComp);
      };

      // If we don't have a cached component or it's stale, fetch/revalidate
      if (!cachedComponent || isStale) {
        fetchOrRevalidate();
      }

      // No deps for now, no render loops
    }, []);

    if (!comp) {
      return fallback_;
    }
    return comp;
  };
}
