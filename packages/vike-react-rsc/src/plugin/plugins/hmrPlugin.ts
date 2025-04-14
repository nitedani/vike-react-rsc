import { type Plugin } from "vite";
const styleFileRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/;

export const hmrPlugin = (): Plugin => {
  return {
    name: "vike-rsc:hmr",
    hotUpdate: {
      order: "pre",
      handler(ctx) {
        const clientEnv = ctx.server.environments.client;
        const cliendIds = new Set(
          Object.values(global.vikeReactRscGlobalState.clientReferences)
        );

        if (this.environment.name === "ssr") {
          const withoutRscMods = ctx.modules.filter(({ id }) => {
            return (
              id &&
              (cliendIds.has(id) ||
                !global.vikeReactRscGlobalState.devServer?.environments.rsc.moduleGraph.getModuleById(
                  id
                ))
            );
          });

          return withoutRscMods;
        }

        if (this.environment.name === "client") {
          const withoutRscMods = ctx.modules.filter(({ id }) => {
            return (
              id &&
              (cliendIds.has(id) ||
                global.vikeReactRscGlobalState.isClientDependency(id) ||
                styleFileRE.test(id) ||
                !global.vikeReactRscGlobalState.devServer?.environments.rsc.moduleGraph.getModuleById(
                  id
                ))
            );
          });

          return withoutRscMods;
        }

        if (this.environment.name === "rsc") {
          const ids = ctx.modules
            .map((mod) => mod.id)
            .filter((v) => v !== null);

          const flattenedImporters = new Set(ctx.modules);
          for (const mod of flattenedImporters) {
            if (mod.id && cliendIds.has(mod.id)) {
              break;
            }
            console.log(
              global.vikeReactRscGlobalState.excludedModuleMap,
              mod.url
            );

            const excludedModule = Object.entries(
              global.vikeReactRscGlobalState.excludedModuleMap
            ).find(([root, jsIds]) =>
              jsIds.some((id) => id.split("?t=")[0] === mod.url)
            )?.[0];
            if (excludedModule) {
              global.vikeReactRscGlobalState.pruneCssRegistry(excludedModule);
              this.environment.moduleGraph.invalidateModule(mod);
              const clientMod =
                clientEnv.moduleGraph.getModuleById(excludedModule);
              const cssProxyModClient = clientEnv.moduleGraph.getModuleById(
                `\0virtual:css-proxy.css?id=${encodeURIComponent(
                  excludedModule
                )}`
              );
              clientEnv.moduleGraph.invalidateModule(clientMod!);
              clientEnv.moduleGraph.invalidateModule(cssProxyModClient!);
              clientEnv.reloadModule(cssProxyModClient!);
              break;
            }

            for (const importer of mod.importers) {
              flattenedImporters.add(importer);
            }
          }

          // console.log("[RSC Plugin] Hot update", ctx.modules, cliendIds);
          if (ids.length > 0) {
            // client reference id is also in react server module graph,
            // but we skip RSC HMR for this case since Client HMR handles it.
            if (ids.some((id) => cliendIds.has(id))) {
              return;
            } else {
              ctx.server.environments.client.hot.send({
                type: "custom",
                event: "rsc:update",
                data: {
                  file: ctx.file,
                },
              });
            }
          }
        }
      },
    },
  };
};
