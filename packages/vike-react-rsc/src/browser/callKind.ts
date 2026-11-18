import { getShared } from "../shared";

/** What a call of a server function from the browser is: a server action, or rsc()'s load of a server component */
export type CallKind = "action" | "componentLoad";

// React's server reference calls callServer(id, args) synchronously and tells it nothing else, so rsc() sets the kind
// around its call. callServer() comes from the app's copy of this package, and rsc() may come from a library's own.
const current = getShared("callKind", (): { kind: CallKind } => ({ kind: "action" }));

/** Runs `call`, whose server function call is a load of a server component */
export function loadComponent<T>(call: () => T): T {
  const previous = current.kind;
  current.kind = "componentLoad";
  try {
    return call();
  } finally {
    current.kind = previous;
  }
}

/** The kind of the call callServer() got, which it reads before its first await */
export function getCallKind(): CallKind {
  return current.kind;
}
