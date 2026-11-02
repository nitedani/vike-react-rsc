import { readFile } from "node:fs/promises";
import type { EnvironmentOptions, Plugin } from "vite";
import { crawlFrameworkPkgs, findClosestPkgJsonPath, findDepPkgJsonPath, isDepExcluded } from "vitefu";

/** In dev, plugin-rsc keeps every package with a react peer out of the ssr and rsc envs' pre-bundles, so the module runner runs its files
 * as they are: the CommonJS packages it imports lack their named exports, e.g. react-focus-lock's prop-types, and a CommonJS one of its
 * own fails to run, e.g. react-device-detect. So both envs pre-bundle the CommonJS packages that react packages import, and the app's own
 * CommonJS react packages, unless the user excludes them.
 * TODO: remove once plugin-rsc pre-bundles the CommonJS deps its crawl finds */
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
  // plugin-rsc's crawl, whose include list names the CommonJS packages that its react packages import
  const { optimizeDeps } = await crawlFrameworkPkgs({ root: process.cwd(), isBuild: false, isFrameworkPkgByJson: isReactPkg });
  // The crawl includes no dependency of the app itself
  const appPkgJsonPath = await findClosestPkgJsonPath(process.cwd());
  if (!appPkgJsonPath) return optimizeDeps.include;
  const { dependencies, devDependencies } = await readJson(appPkgJsonPath);
  const appDeps = await Promise.all(
    Object.keys({ ...dependencies, ...devDependencies }).map(async (dep) => {
      const pkgJsonPath = await findDepPkgJsonPath(dep, appPkgJsonPath);
      return { dep, pkgJson: pkgJsonPath && (await readJson(pkgJsonPath)) };
    }),
  );
  // The module runner can't run a CommonJS react package: one without module, exports or "type": "module"
  const commonJsReactDeps = appDeps.filter(({ pkgJson }) => pkgJson && isReactPkg(pkgJson) && !pkgJson.module && !pkgJson.exports && pkgJson.type !== "module");
  return [...optimizeDeps.include, ...commonJsReactDeps.map(({ dep }) => dep)];
}

function isReactPkg(pkgJson: Record<string, any>): boolean {
  // plugin-rsc's crawl skips itself and react-dom, and plugin-rsc pre-bundles react-server-dom-webpack
  if (["@vitejs/plugin-rsc", "react-dom", "react-server-dom-webpack"].includes(pkgJson.name)) return false;
  return !!pkgJson.peerDependencies && "react" in pkgJson.peerDependencies;
}

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(path, "utf8"));
}
