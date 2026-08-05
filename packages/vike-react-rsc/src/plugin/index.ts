import { type PluginOption, type ViteDevServer } from "vite";
import { configs } from "./plugins/config";
import { exposeDevServer } from "./plugins/dev";
import { vikeRscManifestPluginBuild } from "./plugins/injectManifestBuild";
import { virtuals } from "./plugins/virtuals";
import rsc from "@vitejs/plugin-rsc/plugin";

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
    ...rsc({
      serverHandler: false,
      loadModuleDevProxy: false,
      validateImports: false,
      useBuildAppHook: true,
    }),
  ];
}
