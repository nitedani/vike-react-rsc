import "vike/types";
declare global {
  namespace Vike {
    interface PageContext {
      Page: React.ComponentType;
      rscPayloadString?: string;
      rscPayloadStream?: ReadableStream<Uint8Array>;
    }
  }
}
