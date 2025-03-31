declare module "virtual:runtime/server" {
  const server: typeof import("./server");
  export = server;
}
declare module "virtual:enviroment-name" {
  const name: "rsc" | "ssr" | "client";
  export = name;
}
