import { getShared } from "./shared";

// The fork is stored on pageContext itself, under a Symbol.for() key, so that every copy of this module finds it
const forkKey = Symbol.for("vike-react-rsc:fork");
type Forked = { [forkKey]?: object };

/**
 * From now on, server components read and write a copy of pageContext's keys as they are now. The objects the keys hold
 * stay shared.
 */
export function forkPageContext(pageContext: object): void {
  // Copies descriptors, so no getter runs and Vike's internal props aren't read
  const standIn = Object.create(Object.getPrototypeOf(pageContext), Object.getOwnPropertyDescriptors(pageContext));
  (pageContext as Forked)[forkKey] = standIn;
}

// One per pageContext, so a server action and the render after it get the same object
const views = getShared("forkPageContext", () => new WeakMap<object, object>());

/** What getPageContext() returns: the rsc env's pageContext, or its fork once forkPageContext() ran */
export function getForkedPageContext<T extends object>(pageContext: T): T {
  let view = views.get(pageContext);
  if (!view) views.set(pageContext, (view = createView(pageContext)));
  return view as T;
}

function createView(pageContext: object): object {
  // The rsc env's pageContext is Vike's view of the server's, which reads every key but the config's from it, forkKey too
  const getTarget = () => (pageContext as Forked)[forkKey] ?? pageContext;
  // The fork holds pageContext's keys as they were before the HTML hooks ran. A key with the same value on both is read
  // from the rsc env's pageContext, so `config` is the rsc env's own. Any other key is read from the fork, and a getter
  // runs on the fork.
  const isUnchanged = (fork: object, key: PropertyKey) => {
    const was = Object.getOwnPropertyDescriptor(fork, key);
    const now = Object.getOwnPropertyDescriptor(pageContext, key);
    return !was?.get && !now?.get && !was === !now && was?.value === now?.value;
  };
  // Every trap answers from pageContext or its fork. The empty target `{}` is there only for Proxy's invariant checks,
  // which require every key the target lacks to be reported as configurable.
  return new Proxy(
    {},
    {
      get: (_, key) => {
        const target = getTarget();
        return target === pageContext || isUnchanged(target, key) ? Reflect.get(pageContext, key) : Reflect.get(target, key);
      },
      has: (_, key) => Reflect.has(getTarget(), key),
      set: (_, key, value) => Reflect.set(getTarget(), key, value),
      // Configurable, since Vike's dev server deletes and redefines pageContext's keys to sort them
      defineProperty: (_, key, descriptor) => Reflect.defineProperty(getTarget(), key, { ...descriptor, configurable: true }),
      deleteProperty: (_, key) => Reflect.deleteProperty(getTarget(), key),
      ownKeys: () => Reflect.ownKeys(getTarget()),
      // Vike's getters stay getters, so listing keys runs none
      getOwnPropertyDescriptor: (_, key) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(getTarget(), key);
        return descriptor && { ...descriptor, configurable: true };
      },
    }
  );
}
