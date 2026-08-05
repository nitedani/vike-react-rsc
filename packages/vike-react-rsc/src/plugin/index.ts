import { type PluginOption, type ViteDevServer } from "vite";
import { clientInputBridge } from "./plugins/clientInputBridge";
import { configs } from "./plugins/config";
import { exposeDevServer } from "./plugins/dev";
import { vikeRscManifestPluginBuild } from "./plugins/injectManifestBuild";
import { virtuals } from "./plugins/virtuals";
import rsc from "@vitejs/plugin-rsc";

type GlobalState = {
  devServer?: ViteDevServer;
};

declare global {
  var vikeReactRscGlobalState: GlobalState;
}

global.vikeReactRscGlobalState ||= {
  devServer: undefined,
};

export default function vikeRscPlugin(): PluginOption[] {
  //@ts-ignore
  return [
    ...configs,
    ...virtuals,
    exposeDevServer,
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
