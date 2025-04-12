import { type Plugin } from "vite";
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
                /\.css/.test(id) ||
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
            if (mod.id) {
              // if (cliendIds.has(mod.id)) {
              //   break;
              // }
              const excludedModule =
                global.vikeReactRscGlobalState.excludedModuleMap[mod.id];
              if (excludedModule) {
                console.log({ excludedModule });
                this.environment.moduleGraph.invalidateModule(mod);
                excludedModule.cssIds.forEach((cssId) => {
                  const isVirtual = cssId.startsWith("\0");
                  if (isVirtual) {
                    clientEnv.hot.send({
                      type: "prune",
                      paths: [`/@id/__x00__${cssId.slice(1)}`],
                    });
                  } else {
                    const ccsMod = clientEnv.moduleGraph.getModuleById(cssId);
                    clientEnv.moduleGraph.invalidateModule(ccsMod!);
                    // this.environment.moduleGraph.invalidateAll()
                    // clientEnv.reloadModule(ccsMod!);
                    // clientEnv.hot.send({
                    //   type: "prune",
                    //   paths: [
                    //     "/" + path.relative(clientEnv.config.root, cssId),
                    //   ],
                    // });
                  }
                });
                global.vikeReactRscGlobalState.pruneCssRegistry(
                  excludedModule.root
                );
                const clientMod = clientEnv.moduleGraph.getModuleById(
                  excludedModule.root
                );
                clientEnv.moduleGraph.invalidateModule(clientMod!);
                clientEnv.reloadModule(clientMod!);
                break;
              }
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
