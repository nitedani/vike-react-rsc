import type { Plugin, BuildEnvironmentOptions } from "vite";

export { createVirtualPlugin, normalizeRollupInput };

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

// Helper to create virtual plugins
function createVirtualPlugin(name: string, load: Plugin["load"]): Plugin {
  name = "virtual:" + name;
  return {
    name: `virtual-${name}`,
    resolveId(source) {
      return source === name ? "\0" + name : undefined;
    },
    load(id) {
      if (id === "\0" + name) {
        return (load as Function).apply(this);
      }
    },
  };
}
