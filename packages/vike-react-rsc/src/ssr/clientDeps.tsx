import { setOnClientReference } from "@vitejs/plugin-rsc/ssr";
import { AsyncLocalStorage } from "node:async_hooks";
import { renderToStaticMarkup } from "react-dom/server";
import { getShared } from "../shared";

/** The CSS and JS of the client components a page's HTML renders, for their links, and the loads of their modules */
export class ClientDeps {
  css: Set<string> = new Set();
  js: Set<string> = new Set();
  loads: Promise<unknown>[] = [];
  #injectToStream?: (html: string) => void;

  /** Once the shell has rendered: the links of the client components rendered from now on go in the stream, before the
   * Suspense boundary that renders them */
  streamLinks(injectToStream: (html: string) => void): void {
    this.#injectToStream = injectToStream;
  }

  add(deps: { css: string[]; js: string[] }): void {
    const css = deps.css.filter((href) => !this.css.has(href));
    const js = deps.js.filter((href) => !this.js.has(href));
    for (const href of css) this.css.add(href);
    for (const href of js) this.js.add(href);
    if (this.#injectToStream && (css.length || js.length)) this.#injectToStream(renderClientLinks({ css, js }));
  }
}

const clientDeps = getShared("clientDeps", () => new AsyncLocalStorage<ClientDeps>());
recordClientModuleLoads();
setOnClientReference(({ deps }) => clientDeps.getStore()?.add(deps));

/** Runs `render` with the client deps of the HTML it renders */
export function collectClientDeps<T>(render: (deps: ClientDeps) => T): T {
  const deps = new ClientDeps();
  return clientDeps.run(deps, () => render(deps));
}

// Every load of a client module goes in its render's `loads`: plugin-rsc loads a module on its first use only, and until
// it has loaded, React renders the closest <Suspense> fallback in its place
// TODO: remove once plugin-rsc offers a public way to wait for client modules during SSR: https://github.com/vitejs/vite-plugin-react/issues/1539
function recordClientModuleLoads() {
  const recorded = Symbol.for("vike-react-rsc:loadsRecorded");
  const pluginRsc = globalThis as unknown as { __vite_rsc_client_require__: ((id: string) => Promise<unknown>) & { [recorded]?: true } };
  const load = pluginRsc.__vite_rsc_client_require__;
  if (load[recorded]) return;
  pluginRsc.__vite_rsc_client_require__ = Object.assign(
    (id: string) => {
      const loading = load(id);
      clientDeps.getStore()?.loads.push(loading);
      return loading;
    },
    { [recorded]: true as const }
  );
}

export function renderClientLinks({ css, js }: { css: Iterable<string>; js: Iterable<string> }): string {
  const cssLinks = [...css].map((href) =>
    // In dev, the shape of Vike's own CSS links, so Vike's dev cleanup removes them once Vite has injected the CSS
    import.meta.env.DEV ? (
      <link key={href} rel="stylesheet" type="text/css" href={`${href}?direct`} />
    ) : (
      // The crossOrigin of React's preload for the same file, so the browser uses that preload
      <link key={href} rel="stylesheet" href={href} crossOrigin="" />
    )
  );
  // React drops plugin-rsc's own preloads for a client component whose module loads during the decode, before the render
  const jsLinks = [...js].map((href) => <link key={href} rel="modulepreload" href={href} crossOrigin="" />);
  return renderToStaticMarkup([...cssLinks, ...jsLinks]);
}
