import type { BuildEnvironmentOptions, Plugin } from "vite";

type RollupInput = NonNullable<
  NonNullable<BuildEnvironmentOptions["rollupOptions"]>["input"]
>;

function normalizeRollupInput(
  input: RollupInput | undefined
): Record<string, string> {
  if (!input) return {};
  if (typeof input === "string") return { [input]: input };
  if (Array.isArray(input))
    return Object.fromEntries(input.map((entry) => [entry, entry]));
  return { ...input };
}

/**
 * Vike computes the client entry set — one entry per page plus its client-routing
 * runtime — and writes it to the ROOT `build.rollupOptions.input`. Under
 * `@vitejs/plugin-rsc`'s buildApp orchestration every environment builds from its own
 * `environments.<name>.build.rollupOptions.input`, which never inherits the root one.
 * plugin-rsc populates the client environment's input solely from its `entries.client`
 * option, which we don't pass, so without this projection the client environment builds
 * with no input at all and Vite falls back to `index.html` — a file a Vike app has by
 * design no reason to own.
 *
 * This must run in `buildApp`, not `configResolved`: Vite invokes every configResolved
 * hook concurrently (one `Promise.all` over all sorted hooks), and Vike writes the root
 * input only after awaiting its own config resolution, so any configResolved reader
 * races it and observes `undefined`. buildApp hooks run sequentially, after config
 * resolution has completed.
 */
export function clientInputBridge(): Plugin {
  return {
    name: "vike-rsc:client-input-bridge",
    apply: "build",
    buildApp: {
      order: "pre",
      async handler(builder) {
        const rootInput = normalizeRollupInput(
          builder.config.build?.rollupOptions?.input
        );
        if (Object.keys(rootInput).length === 0) {
          throw new Error(
            "[vike-react-rsc] Expected Vike to have populated build.rollupOptions.input " +
              "with the client entries, but it is empty. The client environment cannot be " +
              "built without entries."
          );
        }

        const clientEnv = builder.environments.client;
        if (!clientEnv) {
          throw new Error(
            "[vike-react-rsc] Missing the 'client' build environment."
          );
        }

        const build = clientEnv.config.build;
        const existing = normalizeRollupInput(build.rollupOptions?.input);
        // Two entries sharing a name but not a target means one would be dropped, and
        // which one is an accident of merge order.
        for (const [name, target] of Object.entries(existing)) {
          const projected = rootInput[name];
          if (projected !== undefined && projected !== target) {
            throw new Error(
              `[vike-react-rsc] Client entry '${name}' is declared twice with different ` +
                `targets: Vike computed '${projected}', the client environment already ` +
                `had '${target}'.`
            );
          }
        }
        (build.rollupOptions ??= {}).input = { ...rootInput, ...existing };
      },
    },
  };
}
