import "vike/types";
declare global {
  namespace Vike {
    interface PageContext {
      Page: React.ComponentType;
      rscPayloadString: string | null;
      rscPayloadStream?: ReadableStream<Uint8Array>;
      handleServerAction?: (
        pageContext: PageContext
      ) => ReturnType<
        typeof import("virtual:runtime/server").handleServerAction
      >;
      handleNavigation?: (
        pageContext: PageContext
      ) => ReturnType<typeof import("virtual:runtime/server").renderPageRsc>;
    }
  }
}
