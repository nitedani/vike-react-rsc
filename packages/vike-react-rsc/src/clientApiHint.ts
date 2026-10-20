// What a server file can call, but React's server build lacks. It lacks Component and PureComponent too, which a class
// component extends.
const clientApis = [
  "createContext", "startTransition", "useActionState", "useContext", "useDeferredValue", "useEffect", "useEffectEvent",
  "useImperativeHandle", "useInsertionEffect", "useLayoutEffect", "useOptimistic", "useReducer", "useRef", "useState",
  "useSyncExternalStore", "useTransition",
];

/** For React's TypeError when a server file uses one of them: the fix, naming the component by the first frame named like
 * one, so never a hook's own file, or else the file that failed as `page` loaded it. A build's stack names its chunks, not
 * the files. `serverComponentImport` is why the page's files run on the server, if a file of the page is a server component
 * because it imports one. */
export function getClientApiHint(error: unknown, page?: string, serverComponentImport?: string[]): string | undefined {
  if (!(error instanceof TypeError)) return;
  const api = error.message.includes("Class extends value undefined") ? "Component" : /(\w+)\)? is not a function/.exec(error.message)?.[1];
  if (!api || !(api === "Component" || clientApis.includes(api))) return;
  const stack = error.stack ?? "";
  const [, component, componentFile] = /^\s*at ([A-Z][\w$]*) \((.+?):\d+:\d+\)$/m.exec(stack) ?? [];
  // A file that fails as it loads is the first frame
  const file = componentFile ?? (page ? /^\s*at (?:eval \()?(.+?):\d+:\d+\)?$/m.exec(stack)?.[1] : undefined);
  const caller = import.meta.env.DEV && file ? file : (component ?? (page ? `A file of ${page}` : "A server component"));
  const use = api === "Component" ? "extends Component or PureComponent" : `calls ${api}()`;
  const runsOnServer = `${caller} ${use}, which runs only in the browser, but runs on the server`;
  if (!serverComponentImport) return `${runsOnServer}: start ${caller === file ? "it" : "its file"} with "use client"`;
  // A "use client" file can't import a server component
  const [importer, ...imported] = serverComponentImport;
  const serverComponent = imported.pop();
  const through = imported.length > 0 ? ` through ${imported.join(", ")}` : "";
  return (
    `${runsOnServer}, as ${importer} imports the server component ${serverComponent}${through}: ` +
    `move the code that ${use} into a "use client" component, or remove "use server component" from ${serverComponent}`
  );
}
