import type { Plugin } from "vite";

export const hmrPlugin = (): Plugin => {
  return {
    name: "vike-rsc:hmr",
    hotUpdate: {
      order: "pre",
      handler(ctx) {
        const cliendIds = new Set(
          Object.values(global.vikeReactRscGlobalState.clientReferences)
        );

        if (this.environment.name === "ssr") {
          // 1. Vike loads RSC components in dev on the ssr graph
          // Here we substract the rsc modules from the client/ssr modules
          const withoutRscMods = ctx.modules.filter(({ id }) => {
            return (
              id &&
              // we need to keep client references explicitly because they are also in rsc module graph
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
                // we need to keep shared client dependencies explicitly because they are also in rsc module graph
                global.vikeReactRscGlobalState.isClientDependency(id) ||
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

          console.log("[RSC Plugin] Hot update", ctx.modules, cliendIds);
          if (ids.length > 0) {
            // client reference id is also in react server module graph,
            // but we skip RSC HMR for this case since Client HMR handles it.
            if (ids.some((id) => cliendIds.has(id))) {
              return [];
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
