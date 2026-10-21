import { useEffect, useState, type ReactNode } from "react";
import { usePageContext } from "../pageContext";
import { getShared } from "../shared";

type Output = { node: ReactNode; generation: number; drops: number; loadedAt: number };

const outputs = new Map<string, Output>();
// One load per key at a time, shared by every component that renders it
const loads = new Map<string, Promise<ReactNode | undefined>>();
// Production builds name every server function "action", so the key tells them apart by identity
const serverComponentIds = new Map<Function, number>();
// callServer() comes from the app's copy of this package, and rsc() may come from a library's own
const state = getShared("rsc", () => ({
  // Raised by every server action except rsc()'s loads: an output loaded before may show data the action changed
  generation: 0,
  // Raised by every redirect that drops the outputs, a library copy's included: an output or a load from before is
  // neither shown, shared nor cached
  drops: 0,
  isLoading: false,
}));

/** Makes a client component that loads the server component from the server, and shows `fallback`, or Loading.component, until it loads */
export function rsc<Props extends object>(
  serverComponent: (props: Props) => Promise<ReactNode>
): (props: Props & { fallback?: ReactNode }) => ReactNode {
  if (!serverComponentIds.has(serverComponent)) serverComponentIds.set(serverComponent, serverComponentIds.size);
  const id = serverComponentIds.get(serverComponent);

  return function RscComponent({ fallback, ...props }) {
    const pageContext = usePageContext();
    const key = `${id}:${JSON.stringify(props)}`;
    const staleTime = pageContext.config.rsc?.staleTime ?? 60_000;
    // Shown until the next load arrives, even when out of date. Never set during SSR: loads start in effects.
    const output = outputs.get(key);
    const cached = output?.drops === state.drops ? output : undefined;
    const isFresh = !!cached && cached.generation === state.generation && Date.now() - cached.loadedAt < staleTime;
    const [loaded, setLoaded] = useState<{ key: string; node: ReactNode }>();

    // New props start a new load and keep the tree: a cached output renders in place, so its client state survives
    useEffect(() => {
      if (isFresh) return;
      let isForCurrentProps = true;
      void load(key, () => serverComponent(props as Props), staleTime).then((node) => {
        if (node !== undefined && isForCurrentProps) setLoaded({ key, node });
      });
      return () => {
        isForCurrentProps = false;
      };
    }, [key]);

    const node = loaded?.key === key ? loaded.node : cached?.node;
    if (node !== undefined) return node;
    const DefaultFallback = pageContext.config.Loading?.component;
    return fallback ?? (DefaultFallback && <DefaultFallback />);
  };
}

/** True while rsc() calls a server function: callServer() reads it in the same synchronous call */
export function isRscLoad(): boolean {
  return state.isLoading;
}

export function markRscOutputsStale(): void {
  state.generation++;
}

export function dropRscOutputs(): void {
  state.drops++;
}

// Resolves to undefined when the load fails: the fallback, or the last output, stays
function load(key: string, call: () => Promise<ReactNode>, staleTime: number): Promise<ReactNode | undefined> {
  const startedAfter = state.drops;
  const loadKey = `${startedAfter}:${key}`;
  const pending = loads.get(loadKey);
  if (pending) return pending;
  // An action that runs while this loads may change what it shows
  const startedIn = state.generation;
  state.isLoading = true;
  const request = call();
  state.isLoading = false;
  const loading = request
    .then(
      (node) => {
        if (staleTime > 0 && node !== undefined && startedAfter === state.drops) outputs.set(key, { node, generation: startedIn, drops: startedAfter, loadedAt: Date.now() });
        return node;
      },
      (error: unknown) => {
        console.error("[vike-react-rsc] rsc() couldn't load the server component:", error);
        return undefined;
      }
    )
    .finally(() => loads.delete(loadKey));
  loads.set(loadKey, loading);
  return loading;
}
