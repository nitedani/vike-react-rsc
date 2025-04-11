import type { Plugin } from "vite";

export const replaceWebpackRequirePlugin = (): Plugin => {
  return {
    name: "rsc-misc",
    enforce: "pre",
    transform(code, id, _options) {
      if (
        this.environment?.name === "ssr" &&
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
  };
};
