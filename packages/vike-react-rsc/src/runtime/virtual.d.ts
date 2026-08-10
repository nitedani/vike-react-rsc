declare module "virtual:runtime/server" {
  const server: typeof import("./server");
  export = server;
}
declare module "virtual:runtime/ssr" {
  const ssr: typeof import("./ssr");
  export = ssr;
}
