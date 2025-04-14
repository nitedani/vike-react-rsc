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

        // if (this.environment.name === "ssr") {
        //   const withoutRscMods = ctx.modules.filter(({ id }) => {
        //     return (
        //       id &&
        //       (cliendIds.has(id) ||
        //         !global.vikeReactRscGlobalState.devServer?.environments.rsc.moduleGraph.getModuleById(
        //           id
        //         ))
        //     );
        //   });

        //   return withoutRscMods;
        // }

        // if (this.environment.name === "client") {
        //   const withoutRscMods = ctx.modules.filter(({ id }) => {
        //     return (
        //       id &&
        //       (cliendIds.has(id) ||
        //         global.vikeReactRscGlobalState.isClientDependency(id) ||
        //         /\.css/.test(id) ||
        //         !global.vikeReactRscGlobalState.devServer?.environments.rsc.moduleGraph.getModuleById(
        //           id
        //         ))
        //     );
        //   });

        //   return withoutRscMods;
        // }

        if (this.environment.name === "rsc") {
          const ids = ctx.modules
            .map((mod) => mod.id)
            .filter((v) => v !== null);

          // const flattenedImporters = new Set(ctx.modules);
          // for (const mod of flattenedImporters) {
          //   if (mod.id) {
          //     if (cliendIds.has(mod.id)) {
          //       break;
          //     }
          //     const excludedModule =
          //       global.vikeReactRscGlobalState.excludedModuleMap[mod.id];
          //     if (excludedModule) {
          //       global.vikeReactRscGlobalState.pruneCssRegistry(
          //         excludedModule.root
          //       );
          //       this.environment.moduleGraph.invalidateModule(mod);
          //       const clientMod = clientEnv.moduleGraph.getModuleById(
          //         excludedModule.root
          //       );
          //       clientEnv.moduleGraph.invalidateModule(clientMod!);
          //       const cssProxyModClient = clientEnv.moduleGraph.getModuleById(
          //         `\0virtual:css-proxy.css?id=${encodeURIComponent(
          //           excludedModule.root
          //         )}`
          //       );
          //       clientEnv.moduleGraph.invalidateModule(cssProxyModClient!);
          //       clientEnv.reloadModule(cssProxyModClient!);
          //       this.environment.reloadModule(clientMod!);
          //       break;
          //     }
          //   }

          //   for (const importer of mod.importers) {
          //     flattenedImporters.add(importer);
          //   }
          // }

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
