import { type PluginOption } from "vite";
import { configs } from "./plugins/config";
import { virtuals } from "./plugins/virtuals";
import rsc from "@vitejs/plugin-rsc";

export default function vikeRscPlugin(): PluginOption[] {
  return [
    ...configs,
    ...virtuals,
    rsc({
      serverHandler: false,
      loadModuleDevProxy: false,
      // Vike owns the HTML, so the client build has no index.html entry chunk for
      // plugin-rsc to bootstrap from.
      customClientEntry: true,
    }),
  ];
}
