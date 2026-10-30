import { setOnClientReference } from "@vitejs/plugin-rsc/ssr";
import { AsyncLocalStorage } from "node:async_hooks";
import { renderToStaticMarkup } from "react-dom/server";
import { getShared } from "../shared";

// The CSS and JS of the client components a page's HTML renders, for their links, and the loads of their modules
const clientDeps = getShared("clientDeps", () => new AsyncLocalStorage<ClientDeps>());
export type ClientDeps = { css: Set<string>; js: Set<string>; loads: Promise<unknown>[]; injectToStream?: (html: string) => void };
recordClientModuleLoads();
setOnClientReference(({ deps }) => {
  const store = clientDeps.getStore();
  if (!store) return;
  const css = deps.css.filter((href) => !store.css.has(href));
  const js = deps.js.filter((href) => !store.js.has(href));
  for (const href of css) store.css.add(href);
  for (const href of js) store.js.add(href);
  // Once the shell has rendered, the links go in the stream, before the Suspense boundary that renders the component
  if (store.injectToStream && (css.length || js.length)) store.injectToStream(renderClientLinks({ css, js }));
});

/** Runs `render` with the client deps of the HTML it renders */
export function collectClientDeps<T>(render: (deps: ClientDeps) => T): T {
  const deps: ClientDeps = { css: new Set(), js: new Set(), loads: [] };
  return clientDeps.run(deps, () => render(deps));
}

// Every load of a client module goes in its render's `loads`: plugin-rsc loads a module on its first use only, and until
// it has loaded, React renders the closest <Suspense> fallback in its place
// TODO: remove once plugin-rsc offers a public way to wait for client modules during SSR, as proposed in
// https://github.com/nitedani-agent/vite-plugin-react/tree/feat/rsc-ssr-client-reference-load
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
