import { type PluginOption, type ViteDevServer } from "vite";
import { clientDepTrackerPlugin } from "./plugins/clientDepTrackerPlugin";
import { configs } from "./plugins/config";
import { cssTrackerPlugin } from "./plugins/cssTrackerPlugin";
import { exposeDevServer } from "./plugins/dev";
import { vikeRscManifestPluginBuild } from "./plugins/injectManifestBuild";
import { serverComponentExclusionPlugin } from "./plugins/serverComponentExclusionPlugin";
import { useClientPlugin } from "./plugins/useClientPlugin";
import { useServerPlugin } from "./plugins/useServerPlugin";
import { virtuals } from "./plugins/virtuals";
import { virtualNormalizeReferenceIdPlugin } from "./utils";
import { hmrPlugin } from "./plugins/hmrPlugin";
import rscCore from "@hiogawa/vite-rsc/core/plugin"

type GlobalState = {
  clientReferences: Record<string, string>;
  serverReferences: Record<string, string>;
  devServer?: ViteDevServer;
  disableUseClientPlugin?: boolean;
  getCssDependencies(id: string): Promise<{
    cssIds: string[];
    jsIds: string[];
  }>;
  pruneCssRegistry(id: string): void;
  isClientDependency(id: string): boolean;
  excludedModuleMap: {
    [moduleId: string]: string[];
  };
};

declare global {
  var vikeReactRscGlobalState: GlobalState;
}

global.vikeReactRscGlobalState ||= {
  clientReferences: {},
  serverReferences: {},
  devServer: undefined,
  disableUseClientPlugin: false,
  getCssDependencies: async () => ({
    cssIds: [],
    jsIds: [],
  }),
  pruneCssRegistry: () => {},
  isClientDependency: () => false,
  excludedModuleMap: {},
};

export default function vikeRscPlugin(): PluginOption[] {
  return [
    ...configs,
    ...virtuals,
    exposeDevServer,
    // vikeRscManifestPluginDev(),
    vikeRscManifestPluginBuild(),
    cssTrackerPlugin(),
    clientDepTrackerPlugin(),
    ...useClientPlugin(),
    ...useServerPlugin(),
    virtualNormalizeReferenceIdPlugin(),
    ...serverComponentExclusionPlugin(),
    hmrPlugin(),
    // this only patches `__webpack_require__.u` on browser.
    // it's supposed to be not necessary with `react-server-dom-vite`.
    rscCore(),
  ];
}
