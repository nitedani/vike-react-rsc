import type { Plugin } from "vite";

export { createVirtualPlugin };

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
