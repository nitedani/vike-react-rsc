import { type PluginOption } from "vite";
import { clientInputBridge } from "./plugins/clientInputBridge";
import { configs } from "./plugins/config";
import { vikeRscManifestPluginBuild } from "./plugins/injectManifestBuild";
import { virtuals } from "./plugins/virtuals";
import rsc from "@vitejs/plugin-rsc";

export default function vikeRscPlugin(): PluginOption[] {
  //@ts-ignore
  return [
    ...configs,
    ...virtuals,
    vikeRscManifestPluginBuild(),
    clientInputBridge(),
    ...rsc({
      serverHandler: false,
      loadModuleDevProxy: false,
      validateImports: false,
      // Vike owns the HTML, so the client build has no index.html entry chunk for
      // plugin-rsc to bootstrap from.
      customClientEntry: true,
    }),
  ];
}
