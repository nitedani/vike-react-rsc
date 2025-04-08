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

type GlobalState = {
  clientReferences: Record<string, string>;
  serverReferences: Record<string, string>;
  devServer?: ViteDevServer;
  disableUseClientPlugin?: boolean;
  getCssDependencies(id: string): string[];
  isClientDependency(id: string): boolean;
};

declare global {
  var vikeReactRscGlobalState: GlobalState;
}

global.vikeReactRscGlobalState ||= {
  clientReferences: {},
  serverReferences: {},
  devServer: undefined,
  disableUseClientPlugin: false,
  getCssDependencies: () => [],
  isClientDependency: () => false,
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
    {
      name: "rsc-misc",
      transform(code, id, _options) {
        if (
          this.environment?.name === "rsc" &&
          id.includes("react-server-dom-webpack")
        ) {
          // rename webpack markers in rsc runtime
          // to avoid conflict with ssr runtime which shares same globals
          code = code.replaceAll(
            "__webpack_require__",
            "__vite_react_server_webpack_require__"
          );
          code = code.replaceAll(
            "__webpack_chunk_load__",
            "__vite_react_server_webpack_chunk_load__"
          );
          return { code, map: null };
        }
        return;
      },
    },
  ];
}
