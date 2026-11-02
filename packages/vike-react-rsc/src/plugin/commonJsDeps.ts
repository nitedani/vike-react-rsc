import { readFile } from "node:fs/promises";
import type { EnvironmentOptions, Plugin } from "vite";
import { crawlFrameworkPkgs, findClosestPkgJsonPath, isDepExcluded } from "vitefu";

/** In dev, plugin-rsc keeps every package with a react peer out of the ssr and rsc envs' pre-bundles, so the module runner runs its files
 * as they are: the CommonJS packages it imports lack their named exports, e.g. react-focus-lock's prop-types, and a CommonJS one of its
 * own fails to run, e.g. react-device-detect. So both envs pre-bundle those CommonJS packages, unless the user excludes them. */
export function commonJsDeps(): Plugin {
  return {
    name: "vike-react-rsc:commonjs-deps",
    apply: "serve",
    // Before plugin-rsc's config hook, so the excludes are the user's
    enforce: "pre",
    async config(config) {
      const deps = await findCommonJsDeps();
      const ssrExclude = [...(config.ssr?.optimizeDeps?.exclude ?? []), ...(config.environments?.ssr?.optimizeDeps?.exclude ?? [])];
      const rscExclude = config.environments?.rsc?.optimizeDeps?.exclude ?? [];
      return {
        environments: {
          ssr: preBundle(deps.filter((dep) => !isDepExcluded(dep, ssrExclude))),
          rsc: preBundle(deps.filter((dep) => !isDepExcluded(dep, rscExclude))),
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

/** The packages as optimizeDeps.include names them, e.g. "react-focus-lock > prop-types" and "react-device-detect" */
async function findCommonJsDeps(): Promise<string[]> {
  const commonJsReactPkgs = new Set<string>();
  // plugin-rsc's crawl, with a CommonJS react package counted as a plain dependency, which the crawl includes when a react package imports it
  const { optimizeDeps } = await crawlFrameworkPkgs({
    root: process.cwd(),
    isBuild: false,
    isFrameworkPkgByJson(pkgJson) {
      // plugin-rsc's crawl skips itself and react-dom, and plugin-rsc pre-bundles react-server-dom-webpack
      if (["@vitejs/plugin-rsc", "react-dom", "react-server-dom-webpack"].includes(pkgJson.name)) return false;
      if (!pkgJson.peerDependencies || !("react" in pkgJson.peerDependencies)) return false;
      // vitefu's pkgNeedsOptimization() check, without the entry file it reads when there's no main field
      if (pkgJson.module || pkgJson.exports) return true;
      commonJsReactPkgs.add(pkgJson.name);
      return false;
    },
  });
  // The crawl includes no dependency of the app itself
  const appPkgJsonPath = await findClosestPkgJsonPath(process.cwd());
  if (!appPkgJsonPath) return optimizeDeps.include;
  const { dependencies, devDependencies } = JSON.parse(await readFile(appPkgJsonPath, "utf8"));
  const appDeps = Object.keys({ ...dependencies, ...devDependencies });
  return [...optimizeDeps.include, ...appDeps.filter((dep) => commonJsReactPkgs.has(dep))];
}
