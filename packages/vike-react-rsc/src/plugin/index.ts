import { type Plugin, type ViteDevServer } from "vite";
import { configs } from "./plugins/config";
import { exposeDevServer } from "./plugins/dev";
import { virtualNormalizeReferenceIdPlugin } from "./utils";
import { clientReferencesPlugin } from "./plugins/clientReferences";
import { virtuals } from "./plugins/virtuals";

type GlobalState = {
  clientReferences: Record<string, string>;
  devServer?: ViteDevServer;
  disableClientTransform?: boolean;
  virtualDistLoaderMapping: Record<string, string>;
};

declare global {
  var vikeReactRscGlobalState: GlobalState;
}

global.vikeReactRscGlobalState ||= {
  clientReferences: {},
  devServer: undefined,
  disableClientTransform: false,
  virtualDistLoaderMapping: {},
};

export function getDevServerInstance(): ViteDevServer | undefined {
  return global.vikeReactRscGlobalState.devServer;
}

export default function vikeRscPlugin(): Plugin[] {
  return [
    ...configs,
    ...virtuals,
    exposeDevServer,

    // "use client"
    ...clientReferencesPlugin(),

    virtualNormalizeReferenceIdPlugin(),

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
