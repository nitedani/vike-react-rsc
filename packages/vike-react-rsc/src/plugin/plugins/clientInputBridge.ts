import type { Plugin } from "vite";
import { normalizeRollupInput } from "../utils";

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
      handler(builder) {
        const rootInput = normalizeRollupInput(
          builder.config.build?.rollupOptions?.input
        );
        const rootKeys = Object.keys(rootInput);
        if (rootKeys.length === 0) {
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
        // Entries already declared for the client environment win over the projection.
        const projected = { ...rootInput, ...existing };
        (build.rollupOptions ??= {}).input = projected;

        const missing = rootKeys.filter((key) => !(key in projected));
        if (missing.length > 0) {
          throw new Error(
            `[vike-react-rsc] Client entries lost while projecting onto the client environment: ${missing.join(
              ", "
            )}`
          );
        }
      },
    },
  };
}
