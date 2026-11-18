import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePageContext } from "../pageContext";
import { getShared } from "../shared";
import { loadComponent } from "./callKind";

type Output = { node: ReactNode; generation: number; drops: number; loadedAt: number };

// Per copy of this package, as the ids in their keys are
const outputs = new Map<string, Output>();
// One load per key and generation at a time, shared by every component that renders it
const loads = new Map<string, Promise<ReactNode | undefined>>();
// Production builds name every server function "action", so the key tells them apart by identity
const serverComponentIds = new Map<Function, number>();
const objectIds = new WeakMap<object, number>();
let objectCount = 0;
// The drops when rsc() first rendered for the page
const dropsOfPages = new WeakMap<object, number>();
// callServer() comes from the app's copy of this package, and rsc() may come from a library's own
const state = getShared("rsc", () => ({
  // Raised by every server action except rsc()'s loads: an output loaded before may show data the action changed
  generation: 0,
  // Called when the generation is raised: the outputs on screen load again
  onStale: new Set<() => void>(),
  // Raised by every redirect that drops the outputs, a library copy's included: an output or a load from before is
  // neither shown, shared nor cached
  drops: 0,
  // What rsc() outputs threw: AbortBoundary tells them from what a server action's answer sent
  thrownByOutputs: new WeakSet<object>(),
}));

/** Makes a client component that loads the server component from the server, and shows `fallback`, or Loading.component, until it loads */
export function rsc<Props extends object>(
  serverComponent: (props: Props) => Promise<ReactNode>
): (props: Props & { fallback?: ReactNode }) => ReactNode {
  if (!serverComponentIds.has(serverComponent)) serverComponentIds.set(serverComponent, serverComponentIds.size);
  const id = serverComponentIds.get(serverComponent);

  return function RscComponent({ fallback, ...props }) {
    const pageContext = usePageContext();
    const key = `${id}:${keyOf(props)}`;
    const staleTime = pageContext.config.rsc?.staleTime ?? 60_000;
    const generation = useSyncExternalStore(subscribeToStale, getGeneration, getGeneration);
    const drops = getDropsOf(pageContext);
    const cached = readOutput(key, staleTime, generation);
    const [loaded, setLoaded] = useState<{ key: string; drops: number; node: ReactNode }>();

    // New props and server actions load it again and keep the tree: the output stays, so its client state survives
    useEffect(() => {
      if (cached?.isFresh) return;
      let isLatest = true;
      void load(key, () => serverComponent(props as Props)).then((node) => {
        if (node !== undefined && isLatest) setLoaded({ key, drops, node });
      });
      return () => {
        isLatest = false;
      };
    }, [key, generation, drops]);

    const node = loaded?.key === key && loaded.drops === drops ? loaded.node : cached?.node;
    if (node !== undefined) return <OutputBoundary>{node}</OutputBoundary>;
    const DefaultFallback = pageContext.config.Loading?.component;
    return fallback ?? (DefaultFallback && <DefaultFallback />);
  };
}

// The output a component shows until the next load arrives, even when out of date, and whether it loads again. None
// with `staleTime: 0`, nor from before a redirect dropped the outputs. Never set during SSR: loads start in effects.
function readOutput(key: string, staleTime: number, generation: number): { node: ReactNode; isFresh: boolean } | undefined {
  const output = outputs.get(key);
  if (staleTime <= 0 || output?.drops !== state.drops) return;
  return { node: output.node, isFresh: output.generation === generation && Date.now() - output.loadedAt < staleTime };
}

// The page a redirect leads to shows no output from before it, and a component that a layout keeps loads again there. The
// page that redirected shows them until it goes: loading again there would redirect again.
function getDropsOf(pageContext: object): number {
  if (!dropsOfPages.has(pageContext)) dropsOfPages.set(pageContext, state.drops);
  return dropsOfPages.get(pageContext)!;
}

// Equal only for props the server function can't tell apart. Only strings hold user text, and they're quoted.
function keyOf(value: unknown, seen = new Map<object, number>()): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `${value}n`;
  if (Object.is(value, -0)) return "-0";
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return String(value);
  // The server gets one object for a repeat, and this ends a cycle
  const firstSeenAt = seen.get(value);
  if (firstSeenAt !== undefined) return `^${firstSeenAt}`;
  seen.set(value, seen.size);
  // The server gets a hole as undefined
  if (Array.isArray(value)) return `[${Array.from(value, (item) => keyOf(item, seen)).join()}]`;
  if (value instanceof Map) return `Map${keyOf([...value], seen)}`;
  if (value instanceof Set) return `Set${keyOf([...value], seen)}`;
  if (value instanceof FormData) return `FormData${keyOf([...value], seen)}`;
  if (value instanceof Date) return `Date(${value.getTime()})`;
  if (value instanceof ArrayBuffer) return `ArrayBuffer[${new Uint8Array(value)}]`;
  if (ArrayBuffer.isView(value)) return `${value.constructor.name}[${new Uint8Array(value.buffer, value.byteOffset, value.byteLength)}]`;
  if (Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.entries(value).map(([name, item]) => `${JSON.stringify(name)}:${keyOf(item, seen)}`).join()}}`;
  }
  // A function, a Blob, a promise, a class instance: only the same object is known to be equal
  if (!objectIds.has(value)) objectIds.set(value, objectCount++);
  return `#${objectIds.get(value)}`;
}

// Marks what the output throws, then leaves it to the error boundaries above
class OutputBoundary extends Component<{ children: ReactNode }> {
  static getDerivedStateFromError(error: unknown): never {
    if (typeof error === "object" && error !== null) state.thrownByOutputs.add(error);
    throw error;
  }

  render(): ReactNode {
    return this.props.children;
  }
}

export function isThrownByRscOutput(error: unknown): boolean {
  return typeof error === "object" && error !== null && state.thrownByOutputs.has(error);
}

export function markRscOutputsStale(): void {
  state.generation++;
  for (const onStale of state.onStale) onStale();
}

function subscribeToStale(onStale: () => void): () => void {
  state.onStale.add(onStale);
  return () => state.onStale.delete(onStale);
}

function getGeneration(): number {
  return state.generation;
}

export function dropRscOutputs(): void {
  state.drops++;
}

// Resolves to undefined when the load fails: the fallback, or the last output, stays
function load(key: string, call: () => Promise<ReactNode>): Promise<ReactNode | undefined> {
  const startedAfter = state.drops;
  // An action that runs while this loads may change what it shows
  const startedIn = state.generation;
  const loadKey = `${startedAfter}:${startedIn}:${key}`;
  const pending = loads.get(loadKey);
  if (pending) return pending;
  const loading = loadComponent(call)
    .then(
      (node) => {
        // Keeps an output loaded after a later action: this one may not show what that action changed
        const isOutdated = (outputs.get(key)?.generation ?? startedIn) > startedIn;
        if (node !== undefined && startedAfter === state.drops && !isOutdated) outputs.set(key, { node, generation: startedIn, drops: startedAfter, loadedAt: Date.now() });
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
