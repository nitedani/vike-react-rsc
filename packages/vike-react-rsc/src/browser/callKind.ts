import { getShared } from "../shared";

/** What a call of a server function from the browser is: a server action, or rsc()'s load of a server component */
export type CallKind = "action" | "componentLoad";

// The props objects rsc() passes to the server functions it loads. React calls callServer() with them among the arguments,
// later for a server function bound on the server. callServer() comes from the app's copy of this package, and rsc() may
// come from a library's own.
const componentLoadProps = getShared("componentLoadProps", () => new WeakSet<object>());

/** Marks `props` as what rsc() passes to the server function whose server component it loads */
export function markComponentLoad<Props extends object>(props: Props): Props {
  componentLoadProps.add(props);
  return props;
}

/** The kind of the server function call whose arguments are `args` */
export function getCallKind(args: unknown[]): CallKind {
  return args.some((arg) => componentLoadProps.has(arg as object)) ? "componentLoad" : "action";
}
