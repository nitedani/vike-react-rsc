// plugin-rsc's private names that the HTML render uses

/** Calls `record` with every load of a client module: plugin-rsc loads a module on its first use only, and until it has
 * loaded, React renders the closest <Suspense> fallback in its place. Once per process, whatever copy of this package asks.
 * TODO: remove once plugin-rsc offers a public way to wait for client modules during SSR: https://github.com/vitejs/vite-plugin-react/issues/1539 */
export function onClientModuleLoad(record: (loading: Promise<unknown>) => void): void {
  const recorded = Symbol.for("vike-react-rsc:loadsRecorded");
  const pluginRsc = globalThis as unknown as { __vite_rsc_client_require__: ((id: string) => Promise<unknown>) & { [recorded]?: true } };
  const load = pluginRsc.__vite_rsc_client_require__;
  if (load[recorded]) return;
  pluginRsc.__vite_rsc_client_require__ = Object.assign(
    (id: string) => {
      const loading = load(id);
      record(loading);
      return loading;
    },
    { [recorded]: true as const }
  );
}
