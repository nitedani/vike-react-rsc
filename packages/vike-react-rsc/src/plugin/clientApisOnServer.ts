import { Visitor, type ESTree, type Plugin } from "vite";
import { clientApis } from "../clientApiHint";
import { getComponentConfigs } from "./componentConfigs";
import { getDirectives, getFile, getFileName, isAppFile, isModuleFile, parseCompiled } from "./parse";
import { findServerComponentImport, getModule, type Context } from "./serverComponentImports";

/** An app's server file that imports a browser-only React API gets a warning, in dev as the server loads it and in the build
 * one that lists every such file, naming each Page, Layout, Wrapper or Loading that imports it and the files in between. Not an
 * error: the file may use it only in the browser, e.g. in a hook that only client components call. React's error, with
 * getClientApiHint(), reports a call that runs on the server */
export function clientApisOnServer(): Plugin {
  // The browser-only React APIs of each server file the rsc build loads
  const clientApiUses = new Map<string, string[]>();
  // plugin-rsc builds the rsc env twice, first to find the client references: both load the same files
  let warned: string | undefined;
  return {
    name: "vike-react-rsc:client-apis-on-server",
    // After placement, which starts a client Page, Layout, Wrapper or Loading with "use client", and before plugin-rsc
    // replaces a "use client" file with its client references
    enforce: "pre",
    async transform(code, id) {
      if (!isAppFile(id) || this.environment.name !== "rsc" || !code.includes("react")) return;
      // Without the imports that only types use
      const program = await parseCompiled(code, id, this.environment.getTopLevelConfig());
      if (getDirectives(program).includes("use client")) return;
      const apis = getClientApis(program);
      if (apis.length === 0) return;
      const { environment } = this;
      // The build knows every importer once it has loaded all modules
      if (environment.mode !== "dev") {
        clientApiUses.set(id, apis);
        return;
      }
      const getComponentConfig = await getComponentConfigs(this);
      const { moduleGraph } = environment;
      const chains = getShortestImportChains(id, getComponentConfig, (id) => [...(moduleGraph.getModuleById(id)?.importers ?? [])].flatMap((importer) => importer.id ?? []));
      this.warn(await getClientApiWarning(id, apis, chains, this));
    },
    async buildEnd() {
      if (this.environment.name !== "rsc" || clientApiUses.size === 0) return;
      const getComponentConfig = await getComponentConfigs(this);
      const warnings = await Promise.all(
        [...clientApiUses].map(([id, apis]) => {
          const chains = getShortestImportChains(id, getComponentConfig, (id) => {
            const { importers = [], dynamicImporters = [] } = this.getModuleInfo(id) ?? {};
            return [...importers, ...dynamicImporters];
          });
          return getClientApiWarning(id, apis, chains, this);
        })
      );
      const warning = warnings.join("\n");
      if (warning !== warned) this.warn((warned = warning));
    },
  };
}

// The shortest way from `id` up its importers to each Page, Layout, Wrapper or Loading, or to a file the app's code doesn't
// import. Each file once: the ways up a file that many others share multiply with every level of them.
function getShortestImportChains(id: string, isComponent: (id: string) => unknown, getImporters: (id: string) => string[]): string[][] {
  const chains: string[][] = [];
  const visited = new Set([id]);
  const queue = [[id]];
  for (const chain of queue) {
    const file = chain.at(-1)!;
    const importers = isComponent(file) ? [] : getImporters(file).filter((importer) => isModuleFile(importer) && !chain.includes(importer));
    if (importers.length === 0) chains.push(chain);
    for (const importer of importers) {
      if (visited.has(importer)) continue;
      visited.add(importer);
      queue.push([...chain, importer]);
    }
  }
  // Files that import only each other have no top
  return chains.length > 0 ? chains : [[id]];
}

// The browser-only APIs the module imports from React: by name, or used on a namespace or default import, e.g. React.useState
function getClientApis(program: ESTree.Program): string[] {
  const apis = new Set<string>();
  const namespaces = new Set<string>();
  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration" || statement.source.value !== "react") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== "ImportSpecifier") namespaces.add(specifier.local.name);
      else if (specifier.imported.type === "Identifier" && clientApis.includes(specifier.imported.name)) apis.add(specifier.imported.name);
    }
  }
  for (const api of getNamespaceApis(program, namespaces)) apis.add(api);
  return [...apis];
}

// The browser-only APIs used as `name.api` where `name` is one of `namespaces` and no scope around the use binds another `name`
function getNamespaceApis(program: ESTree.Program, namespaces: Set<string>): string[] {
  const scopes: Scope[] = [{ names: new Set(), isFunction: true }];
  const uses: { name: string; api: string; around: Scope[] }[] = [];
  const declare = (pattern: ESTree.Node | null | undefined, scope = scopes.at(-1)!) => {
    for (const name of getBoundNames(pattern)) scope.names.add(name);
  };
  const enter = (isFunction = false) => scopes.push({ names: new Set(), isFunction });
  const exit = () => scopes.pop();
  const enterBlock = () => enter();
  const enterFunction = ({ type, id, params }: ESTree.Function) => {
    // A function declaration's name is bound around it, a function expression's only inside it
    if (type === "FunctionDeclaration") declare(id);
    enter(true);
    if (type === "FunctionExpression") declare(id);
    params.forEach((param) => declare(param));
  };
  new Visitor({
    FunctionDeclaration: enterFunction,
    "FunctionDeclaration:exit": exit,
    FunctionExpression: enterFunction,
    "FunctionExpression:exit": exit,
    ArrowFunctionExpression: ({ params }) => {
      enter(true);
      params.forEach((param) => declare(param));
    },
    "ArrowFunctionExpression:exit": exit,
    StaticBlock: () => enter(true),
    "StaticBlock:exit": exit,
    BlockStatement: enterBlock,
    "BlockStatement:exit": exit,
    ForStatement: enterBlock,
    "ForStatement:exit": exit,
    ForInStatement: enterBlock,
    "ForInStatement:exit": exit,
    ForOfStatement: enterBlock,
    "ForOfStatement:exit": exit,
    SwitchStatement: enterBlock,
    "SwitchStatement:exit": exit,
    CatchClause: ({ param }) => {
      enter();
      declare(param);
    },
    "CatchClause:exit": exit,
    ClassDeclaration: ({ id }) => declare(id),
    ClassExpression: ({ id }) => {
      enter();
      declare(id);
    },
    "ClassExpression:exit": exit,
    VariableDeclaration: ({ kind, declarations }) => {
      // var belongs to the enclosing function, wherever it's written
      const scope = kind === "var" ? scopes.findLast(({ isFunction }) => isFunction) : scopes.at(-1);
      for (const { id } of declarations) declare(id, scope);
    },
    MemberExpression: ({ object, property, computed }) => {
      if (computed || object.type !== "Identifier" || !namespaces.has(object.name) || property.type !== "Identifier" || !clientApis.includes(property.name)) return;
      uses.push({ name: object.name, api: property.name, around: [...scopes] });
    },
  }).visit(program);
  // Once every scope is complete: a name can be bound after its use, e.g. by a var further down
  return uses.filter(({ name, around }) => !around.some((scope) => scope.names.has(name))).map(({ api }) => api);
}

type Scope = { names: Set<string>; isFunction: boolean };

function getBoundNames(pattern: ESTree.Node | null | undefined): string[] {
  switch (pattern?.type) {
    case "Identifier":
      return [pattern.name];
    case "ObjectPattern":
      return pattern.properties.flatMap((property) => getBoundNames(property.type === "Property" ? (property.value as ESTree.Node) : property));
    case "ArrayPattern":
      return pattern.elements.flatMap(getBoundNames);
    case "AssignmentPattern":
      return getBoundNames(pattern.left);
    case "RestElement":
      return getBoundNames(pattern.argument);
    default:
      return [];
  }
}

// The fix, and why the file runs on the server: the server component it imports, or else the way up its importers to each page
async function getClientApiWarning(id: string, apis: string[], chains: string[][], context: Context): Promise<string> {
  const { root } = context.environment.config;
  const uses = apis.map((api) => (api === "Component" || api === "PureComponent" ? api : `${api}()`)).join(", ");
  const runsOnServer = `${getFileName(id, root)} uses ${uses} from react, which runs only in the browser, but runs on the server`;
  // A file without a directive that imports a server component runs on the server for it, and a "use client" file can't import one
  const walk = (file: string) => getModule(context, file);
  const { serverComponentImport } = (await walk(getFile(id))).directives.length === 0 ? await findServerComponentImport(getFile(id), walk) : {};
  if (serverComponentImport) {
    const [, ...imported] = serverComponentImport.map((file) => getFileName(file, root));
    const serverComponent = imported.pop()!;
    const through = imported.length > 0 ? ` through ${imported.join(", ")}` : "";
    // A package's file isn't the app's to change
    const fix = serverComponent.startsWith("node_modules/") ? "" : `, or remove "use server component" from ${serverComponent}`;
    return `${runsOnServer}, as it imports the server component ${serverComponent}${through}: move the code that uses ${uses} into a "use client" component${fix}`;
  }
  const warnings = chains.map(([, ...importers]) => {
    const [importer, ...between] = importers.map((file) => getFileName(file, root)).reverse();
    const through = between.length > 0 ? ` through ${between.join(", ")}` : "";
    return `${runsOnServer}${importer ? `, as ${importer} imports it${through}` : ""}: move the code that uses ${uses} into a "use client" file (this one, if nothing else in it needs the server)`;
  });
  return [...new Set(warnings)].join("\n");
}
