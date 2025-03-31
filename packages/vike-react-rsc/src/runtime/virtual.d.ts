declare module "virtual:runtime/server" {
  const server: typeof import("./server");
  export = server;
}
