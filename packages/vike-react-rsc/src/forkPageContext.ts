import { getShared } from "./shared";

// Kept on pageContext itself, which the rsc env's pageContext views
const forkKey = Symbol.for("vike-react-rsc:fork");
type Forked = { [forkKey]?: object };

/** From now on, server components read and write a copy of pageContext as it is now */
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
  const getTarget = () => (pageContext as Forked)[forkKey] ?? pageContext;
  // The fork holds pageContext as it was before the HTML hooks. A key with the same value on both reads from the rsc env's
  // pageContext, so `config` is the rsc env's; any other key reads from the fork, and a getter runs on the fork.
  const isUnchanged = (fork: object, key: PropertyKey) => {
    const was = Object.getOwnPropertyDescriptor(fork, key);
    const now = Object.getOwnPropertyDescriptor(pageContext, key);
    return !was?.get && !now?.get && !was === !now && was?.value === now?.value;
  };
  // Every trap answers from pageContext or its fork, so the target `{}` only serves Proxy's checks, which require each
  // key it lacks to be reported configurable
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
