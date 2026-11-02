import type { EnvironmentOptions, Plugin } from "vite";
import { crawlFrameworkPkgs, isDepExcluded } from "vitefu";

/** In dev, plugin-rsc keeps the packages with a react peer, except react-dom and react-server-dom-webpack, out of the ssr and rsc envs'
 * pre-bundles, so the module runner runs their files as they are, and Node loads the CommonJS packages they import, where a named import
 * or a require() of them fails, e.g. react-focus-lock's prop-types and react-device-detect's ua-parser-js. So both envs pre-bundle those
 * CommonJS packages, unless the user excludes them.
 * TODO: remove once plugin-rsc pre-bundles the CommonJS deps its crawl finds */
export function commonJsDeps(): Plugin {
  return {
    name: "vike-react-rsc:commonjs-deps",
    apply: "serve",
    // Before plugin-rsc's config hook, so the excludes are the user's
    enforce: "pre",
    async config(config) {
      // plugin-rsc's crawl, whose include list names the CommonJS packages that its react packages import, e.g. "react-focus-lock > prop-types"
      const { optimizeDeps } = await crawlFrameworkPkgs({ root: process.cwd(), isBuild: false, isFrameworkPkgByJson: isReactPkg });
      const ssrExclude = [...(config.ssr?.optimizeDeps?.exclude ?? []), ...(config.environments?.ssr?.optimizeDeps?.exclude ?? [])];
      const rscExclude = config.environments?.rsc?.optimizeDeps?.exclude ?? [];
      return {
        environments: {
          ssr: preBundle(optimizeDeps.include.filter((dep) => !isDepExcluded(dep, ssrExclude))),
          rsc: preBundle(optimizeDeps.include.filter((dep) => !isDepExcluded(dep, rscExclude))),
        },
      };
    },
  };
}

function preBundle(include: string[]): EnvironmentOptions {
  return {
    optimizeDeps: { include },
    // A server env loads an external package with Node, never from its pre-bundle
    resolve: { noExternal: include.map((dep) => dep.slice(dep.lastIndexOf(">") + 1).trim()) },
  };
}

function isReactPkg(pkgJson: Record<string, any>): boolean {
  // plugin-rsc's crawl skips itself and react-dom, and plugin-rsc pre-bundles react-server-dom-webpack
  if (["@vitejs/plugin-rsc", "react-dom", "react-server-dom-webpack"].includes(pkgJson.name)) return false;
  return !!pkgJson.peerDependencies && "react" in pkgJson.peerDependencies;
}
