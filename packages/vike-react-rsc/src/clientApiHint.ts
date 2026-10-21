// What a server file can call, but React's server build lacks. It lacks Component and PureComponent too, which a class
// component extends.
const clientApis = [
  "createContext", "startTransition", "useActionState", "useContext", "useDeferredValue", "useEffect", "useEffectEvent",
  "useImperativeHandle", "useInsertionEffect", "useLayoutEffect", "useOptimistic", "useReducer", "useRef", "useState",
  "useSyncExternalStore", "useTransition",
];

/** For React's TypeError when a server file uses one of them: the fix, naming the component by the first frame named like
 * one, so never a hook's own file, or else the file that failed as `page` loaded it. A build's stack names its chunks, not
 * the files. `serverComponentImports` are the files from each of the page's files that is a server component because it
 * imports one, to that server component. */
export function getClientApiHint(error: unknown, page?: string, serverComponentImports: string[][] = []): string | undefined {
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
  // If the failing file is one of those files: the files from it to the server component it imports. They're named from the
  // app's root, so a file outside it starts with ../
  const serverComponentImport = serverComponentImports.flatMap((files) => {
    const index = files.slice(0, -1).findIndex((imported) => file?.endsWith(`/${imported.replace(/^(\.\.\/)+/, "")}`));
    return index === -1 ? [] : [files.slice(index)];
  })[0];
  if (!serverComponentImport) {
    // A build's stack doesn't name the failing file, which could be one of those
    const orMove = !import.meta.env.DEV && serverComponentImports.length > 0 ? `, or, if its file imports a server component, move the code that ${use} into a "use client" component` : "";
    return `${runsOnServer}: start ${caller === file ? "it" : "its file"} with "use client"${orMove}`;
  }
  // A "use client" file can't import a server component
  const [importer, ...imported] = serverComponentImport;
  const serverComponent = imported.pop();
  const through = imported.length > 0 ? ` through ${imported.join(", ")}` : "";
  return (
    `${runsOnServer}, as ${importer} imports the server component ${serverComponent}${through}: ` +
    `move the code that ${use} into a "use client" component, or remove "use server component" from ${serverComponent}`
  );
}
