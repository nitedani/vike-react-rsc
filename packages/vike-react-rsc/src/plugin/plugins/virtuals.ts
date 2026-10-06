import type { Plugin } from "vite";
import { createVirtualPlugin } from "../utils";

export const virtuals: Plugin[] = [
  createVirtualPlugin("environment-name", function () {
    return `export default ${JSON.stringify(this.environment.name)};`;
  }),
];
