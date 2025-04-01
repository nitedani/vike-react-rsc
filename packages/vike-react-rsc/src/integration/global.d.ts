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
declare global {
  interface Window {
    setPromise: React.Dispatch<React.SetStateAction<Promise<React.ReactNode>>>
  }
}
