import React, { type ComponentType, useEffect } from "react";
import { usePageContext } from "../hooks/pageContext/pageContext-client";
import { getCachedServerComponent, cacheServerComponent, markServerComponentRevalidating } from "./cache";
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

      // Function to fetch or revalidate the component
      const fetchOrRevalidate = () => {
        // Check if there's already a pending request for this component
        const pendingRequest = globalState.pendingRequests.get(cacheKey);

        if (pendingRequest) {
          // If there's already a request in flight, subscribe to it
          console.log(`[RSC Client] Reusing pending request for ${c.name || 'UnknownComponent'}`, rest);
          pendingRequest.then((result) => {
            // Update state with the fresh result
            setComp(result);
          });
        } else {
          // No pending request, create a new one
          console.log(`[RSC Client] ${cachedComponent ? 'Revalidating' : 'Fetching'} server component ${c.name || 'UnknownComponent'}`, rest);

          // Mark the component as being revalidated
          if (cachedComponent) {
            markServerComponentRevalidating(cacheKey);
          }

          // Set the flag to indicate this is an RSC call from a client component
          globalState.isRscCall = true;

          // Create the promise for the server component
          const serverComponentPromise = c(rest as P);

          // Reset the flag immediately after creating the promise
          globalState.isRscCall = false;

          // Process the promise result
          const requestPromise = serverComponentPromise.then((result) => {
            // Cache the fresh result
            cacheServerComponent(cacheKey, result, pageContext);
            // Remove this request from the pending requests map
            globalState.pendingRequests.delete(cacheKey);
            // Return the result for other subscribers
            return result;
          }).catch((error) => {
            // If there's an error, remove from pending requests
            console.error("[RSC Client] Error fetching server component:", error);
            globalState.pendingRequests.delete(cacheKey);
            throw error;
          });

          // Add the promise to the pending requests map
          globalState.pendingRequests.set(cacheKey, requestPromise);

          // Subscribe to the promise
          requestPromise.then(setComp);
        }
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
