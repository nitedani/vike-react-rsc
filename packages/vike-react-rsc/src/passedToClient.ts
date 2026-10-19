// The pageContext values rerender() sends to the browser, serialized as Vike serializes them for a navigation. Flight
// carries the promises and streams among them, e.g. a promise data() returns for the browser to await, and the
// serializer what each of them yields.
import { parse } from "@brillout/json-serializer/parse";
import { stringify } from "@brillout/json-serializer/stringify";
import type { PageContextServer } from "vike/types";
import type { PassedToClient } from "./types";

// Stands for a promise or stream, followed by its index among the values Flight carries. The serializer escapes a user
// string that starts with "!", so no string looks like it.
const STREAMED_MARKER = "!vike-react-rsc:";

type Streamed<T> = PromiseLike<T> | AsyncIterable<T>;

// The browser's pageContext values that data() and the hooks compute again after the action: data, and the app's
// passToClient, picked as Vike picks them ('user.id' for a nested value, '\\.' for a dot in a name)
export function getPassedToClient(pageContext: PageContextServer): PassedToClient {
  const passed: Record<string, unknown> = {};
  const props = (pageContext.config.passToClient ?? [])
    .flat()
    // Vike's Config type also takes { prop, once }, which its resolved type leaves out
    .map((prop: string | { prop: string }) => (typeof prop === "string" ? prop : prop.prop))
    .filter((prop) => prop !== "rscPayload");
  for (const prop of ["data", ...props]) {
    const keys = prop.split(/(?<!\\)\./).map((key) => key.replace(/\\\./g, "."));
    // A value the server no longer has is gone in the browser too
    if (!(keys[0]! in passed)) passed[keys[0]!] = undefined;
    const last = keys.at(-1)!;
    const parent = keys.slice(0, -1).reduce<unknown>((obj, key) => (isObject(obj) ? obj[key] : undefined), pageContext);
    const value = isObject(parent) ? parent[last] : undefined;
    // Like Vike, a key the server has is passed even when its value is undefined. Vike's pageContext also answers a key
    // it doesn't have from globalContext, e.g. one onCreateGlobalContext() sets.
    if (!isObject(parent) || (!(last in parent) && value === undefined)) continue;
    let to = passed;
    for (const key of keys.slice(0, -1)) to = (to[key] ??= {}) as Record<string, unknown>;
    to[last] = value;
  }
  return serializePassedToClient(passed);
}

function serializePassedToClient(passed: Record<string, unknown>): PassedToClient {
  try {
    return serialize(passed);
  } catch {
    // As Vike does, a value the serializer can't carry, e.g. a function only server components read, is left out
    for (const [key, value] of Object.entries(passed)) {
      try {
        stringify(value, { forbidReactElements: true, valueName: `pageContext.${key}` });
      } catch (error) {
        console.warn(`[vike-react-rsc] Client components get pageContext.${key} as undefined after rerender(): ${(error as Error).message}`);
        passed[key] = undefined;
      }
    }
    return serialize(passed);
  }
}

export function parsePassedToClient(passedToClient: PassedToClient): Record<string, unknown> {
  return deserialize(passedToClient) as Record<string, unknown>;
}

function serialize(value: unknown): PassedToClient {
  const streamed: Streamed<unknown>[] = [];
  const serialized = stringify(value, {
    forbidReactElements: true,
    // Read by the browser's parse(), never put in HTML
    htmlScriptSafe: false,
    replacer: (_key, value) => {
      if (!isStreamed(value)) return undefined;
      // The same value referenced twice is sent once
      const id = streamed.includes(value) ? streamed.indexOf(value) : streamed.push(value) - 1;
      return { replacement: STREAMED_MARKER + id };
    },
  });
  // Only once the serializer succeeded: a stream can be read only once
  return { serialized, streamed: streamed.map((value) => mapStreamed(value, serialize)) };
}

function deserialize({ serialized, streamed }: PassedToClient): unknown {
  const revived: unknown[] = [];
  return parse(serialized, {
    reviver: (_path, value) => {
      if (!value.startsWith(STREAMED_MARKER)) return undefined;
      const id = Number(value.slice(STREAMED_MARKER.length));
      return { replacement: (revived[id] ??= mapStreamed(streamed[id] as Streamed<PassedToClient>, deserialize)) };
    },
  });
}

// The same kind of promise or stream, yielding map() of what `value` yields
function mapStreamed(value: Streamed<any>, map: (value: any) => unknown): unknown {
  if (value instanceof ReadableStream) {
    return value.pipeThrough(new TransformStream({ transform: (chunk, controller) => controller.enqueue(map(chunk)) }));
  }
  if ("then" in value) {
    const promise = Promise.resolve(value).then(map);
    // As Vike's: no unhandled rejection when nobody awaits it
    promise.catch(() => {});
    return promise;
  }
  return (async function* () {
    for await (const chunk of value) yield map(chunk);
  })();
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
// A promise, a ReadableStream or an async iterable, as Vike streams them
const isStreamed = (value: unknown): value is Streamed<unknown> =>
  typeof value === "object" &&
  value !== null &&
  (typeof (value as PromiseLike<unknown>).then === "function" || Symbol.asyncIterator in value);
