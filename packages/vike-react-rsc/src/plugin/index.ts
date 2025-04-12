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
import { replaceWebpackRequirePlugin } from "./plugins/replaceWebpackRequirePlugin";

type GlobalState = {
  clientReferences: Record<string, string>;
  serverReferences: Record<string, string>;
  devServer?: ViteDevServer;
  disableUseClientPlugin?: boolean;
  getCssDependencies(id: string): {
    cssIds: string[];
    jsIds: string[];
    jsDirectImporterMap: Record<string, string[]>;
    cssDirectImporterMap: Record<string, string[]>;
  };
  pruneCssRegistry(id: string): void;
  isClientDependency(id: string): boolean;
  excludedModuleMap: {
    [moduleId: string]: {
      root: string;
      cssIds: string[];
    };
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
  getCssDependencies: () => ({
    cssIds: [],
    jsIds: [],
    jsDirectImporterMap: {},
    cssDirectImporterMap: {},
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
    serverComponentExclusionPlugin(),
    replaceWebpackRequirePlugin(),
    hmrPlugin(),
  ];
}
