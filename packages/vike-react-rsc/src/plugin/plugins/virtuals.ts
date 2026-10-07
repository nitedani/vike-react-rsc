import type { Plugin } from "vite";

// The name of the Vite environment that imports it, for the environment assertions
const name = "virtual:environment-name";

export const virtuals: Plugin[] = [
  {
    name: `virtual-${name}`,
    resolveId(source) {
      return source === name ? "\0" + name : undefined;
    },
    load(id) {
      if (id === "\0" + name) return `export default ${JSON.stringify(this.environment.name)};`;
    },
  },
];
