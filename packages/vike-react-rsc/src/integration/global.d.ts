import "vike/types";
declare global {
  namespace Vike {
    interface PageContext {
      Page: React.ComponentType;
      rscPayloadString: string | null;
      rscPayloadStream?: ReadableStream<Uint8Array>;
    }
  }
}
